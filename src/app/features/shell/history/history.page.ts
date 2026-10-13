import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { Moto } from '@core/models/models';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { SupabaseService } from '@core/services/supabase.service';

interface HistorialItem {
  id: string;
  tipo: 'Combustible' | 'Mantenimiento';
  detalle: string;
  fecha: string;
  moto: string;
  kilometraje: number | null;
  costo: number | null;
}

@Component({
  selector: 'app-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, CurrencyPipe, DatePipe, DecimalPipe],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Historial</ion-title></ion-toolbar></ion-header>
    <ion-content [fullscreen]="true">
      <main class="history-page">
        <p class="eyebrow">ACTIVIDAD</p>
        <h1>Historial</h1>
        <p class="subtitle">Tanqueadas y mantenimientos de tus motos.</p>
        @if (items().length) {
          <section class="history-list" aria-label="Movimientos recientes">
            @for (item of items(); track item.id) {
              <article class="history-row">
                <div class="movement-icon" [class.maintenance]="item.tipo === 'Mantenimiento'">
                  <ion-icon [name]="item.tipo === 'Mantenimiento' ? 'construct-outline' : 'water-outline'" aria-hidden="true"></ion-icon>
                </div>
                <div class="movement-info">
                  <h2>{{ item.detalle }}</h2>
                  <p>{{ item.moto }} · {{ item.fecha ? (item.fecha | date:'d MMM y') : 'Fecha no disponible' }}</p>
                  @if (item.kilometraje !== null) { <span>{{ item.kilometraje | number }} km</span> }
                </div>
                @if (item.costo !== null) { <strong>{{ item.costo | currency:'COP':'symbol-narrow':'1.0-0' }}</strong> }
              </article>
            }
          </section>
        } @else if (cargado()) {
          <section class="empty-state">
            <div class="empty-icon"><ion-icon name="time-outline" aria-hidden="true"></ion-icon></div>
            <h2>Sin movimientos todavía</h2>
            <p>Cuando registres una tanqueada o mantenimiento, aparecerá aquí.</p>
          </section>
        } @else {
          <section class="empty-state">
            <div class="empty-icon"><ion-icon name="cloud-offline-outline" aria-hidden="true"></ion-icon></div>
            <h2>No se pudo cargar el historial</h2>
            <p>Comprueba tu conexión e inténtalo de nuevo.</p>
            <ion-button fill="outline" (click)="cargarHistorial()">Reintentar</ion-button>
          </section>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .history-page { max-width: 720px; margin: auto; padding: 28px 20px 40px; }
    .eyebrow { margin: 0 0 8px; color: var(--ion-color-primary); font-size: 11px; font-weight: 700; }
    h1 { margin: 0; color: var(--rod-text-heading); font: 700 28px/1.15 var(--rod-font-heading); }
    .subtitle { margin: 8px 0 24px; color: var(--rod-text-secondary); font-size: 14px; }
    .history-list { display: grid; }
    .history-row { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 16px 0; border-bottom: 1px solid var(--rod-border); }
    .movement-icon, .empty-icon { display: grid; flex: 0 0 44px; width: 44px; height: 44px; place-items: center; border-radius: 50%; color: var(--ion-color-primary); background: color-mix(in srgb, var(--ion-color-primary) 14%, transparent); }
    .movement-icon.maintenance { color: var(--ion-color-warning); background: color-mix(in srgb, var(--ion-color-warning) 14%, transparent); }
    .movement-icon ion-icon { font-size: 22px; }
    .movement-info { flex: 1; min-width: 0; }
    .movement-info h2 { margin: 0; color: var(--rod-text-heading); font: 600 15px var(--rod-font-heading); overflow-wrap: anywhere; }
    .movement-info p, .movement-info span { display: block; margin: 5px 0 0; color: var(--rod-text-secondary); font-size: 12px; }
    .history-row strong { color: var(--rod-text-heading); font-size: 13px; white-space: nowrap; }
    .empty-state { display: flex; min-height: 52vh; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; }
    .empty-icon { flex-basis: 72px; width: 72px; height: 72px; color: var(--ion-color-primary); }
    .empty-icon ion-icon { font-size: 36px; }
    .empty-state h2 { margin: 20px 0 0; color: var(--rod-text-heading); font: 600 20px var(--rod-font-heading); }
    .empty-state p { max-width: 290px; margin: 8px 0 20px; color: var(--rod-text-secondary); font-size: 14px; line-height: 1.5; }
  `],
})
export class HistoryPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly supabase = inject(SupabaseService);

  readonly items = signal<HistorialItem[]>([]);
  readonly cargado = signal(false);

  ngOnInit(): void {
    void this.cargarHistorial();
  }

  async cargarHistorial(): Promise<void> {
    const userId = this.auth.sesion()?.userId;
    if (!userId) return;
    const loading = await this.notify.showLoading('Cargando historial...');
    try {
      const { data: motosData, error: motosError } = await this.supabase.getMotos(userId);
      if (motosError) throw motosError;
      const motos = (motosData ?? []) as Moto[];
      const registros = await Promise.all(motos.map(async (moto) => {
        if (!moto.id) return [];
        const [combustible, mantenimiento] = await Promise.all([
          this.supabase.getCombustiblePorMoto(moto.id),
          this.supabase.getMantenimientosPorMoto(moto.id),
        ]);
        if (combustible.error) throw combustible.error;
        if (mantenimiento.error) throw mantenimiento.error;
        const motoLabel = `${moto.marca} ${moto.modelo}`;
        const fuelItems = (combustible.data ?? []).map((row) => ({
          id: `fuel-${row['id']}`, tipo: 'Combustible' as const,
          detalle: String(row['tipo_gasolina'] ?? 'Tanqueada'),
          fecha: String(row['created_at'] ?? row['fecha'] ?? ''), moto: motoLabel,
          kilometraje: Number.isFinite(Number(row['kilometraje'])) ? Number(row['kilometraje']) : null,
          costo: Number.isFinite(Number(row['costo'])) ? Number(row['costo']) : null,
        }));
        const maintenanceItems = (mantenimiento.data ?? []).map((row) => ({
          id: `maintenance-${row['id']}`, tipo: 'Mantenimiento' as const,
          detalle: String(row['tipo'] ?? 'Mantenimiento'),
          fecha: String(row['fecha'] ?? row['created_at'] ?? ''), moto: motoLabel,
          kilometraje: Number.isFinite(Number(row['kilometraje'])) ? Number(row['kilometraje']) : null,
          costo: Number.isFinite(Number(row['costo'])) ? Number(row['costo']) : null,
        }));
        return [...fuelItems, ...maintenanceItems];
      }));
      this.items.set(registros.flat().sort((a, b) => b.fecha.localeCompare(a.fecha)));
      this.cargado.set(true);
    } catch (error) {
      await this.notify.error(this.esErrorRed(error)
        ? 'Error de conexión. Revisa tu internet e intenta de nuevo.'
        : 'No se pudo cargar el historial. Verifica la configuración del servicio.');
    } finally {
      await loading.dismiss();
    }
  }

  private esErrorRed(error: unknown): boolean {
    const message = (error as { message?: string })?.message?.toLowerCase() ?? '';
    return message.includes('network') || message.includes('failed to fetch');
  }
}