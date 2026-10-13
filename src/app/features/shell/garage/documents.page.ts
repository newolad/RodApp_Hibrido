import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { Moto } from '@core/models/models';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { SupabaseService } from '@core/services/supabase.service';

interface DocumentoVista {
  id: string;
  nombre: string;
  moto: string;
  vencimiento: string | null;
  detalle: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <ion-button slot="start" fill="clear" routerLink="/app/garaje" aria-label="Volver al garaje">
        <ion-icon slot="icon-only" name="arrow-back-outline" aria-hidden="true"></ion-icon>
      </ion-button>
      <ion-title>Documentos</ion-title>
    </ion-toolbar></ion-header>
    <ion-content [fullscreen]="true">
      <main class="documents-page">
        <p class="eyebrow">DOCUMENTACIÓN</p>
        <h1>Documentos</h1>
        <p class="subtitle">SOAT, revisión técnico-mecánica y otros documentos de tus motos.</p>
        @if (documentos().length) {
          <section class="document-list" aria-label="Documentos registrados">
            @for (documento of documentos(); track documento.id) {
              <article class="document-row">
                <div class="document-icon"><ion-icon name="document-text-outline" aria-hidden="true"></ion-icon></div>
                <div class="document-info">
                  <h2>{{ documento.nombre }}</h2>
                  <p>{{ documento.moto }} · {{ documento.detalle }}</p>
                  @if (documento.vencimiento) { <span>Vence {{ documento.vencimiento | date:'d MMM y' }}</span> }
                </div>
              </article>
            }
          </section>
        } @else if (cargado()) {
          <section class="empty-state">
            <div class="empty-icon"><ion-icon [name]="tieneMotos() ? 'document-text-outline' : 'bicycle-outline'" aria-hidden="true"></ion-icon></div>
            <h2>{{ tieneMotos() ? 'Aún no tienes documentos' : 'Registra primero una moto' }}</h2>
            <p>{{ tieneMotos() ? 'Agrega documentos para consultar aquí sus datos y vencimientos.' : 'Los documentos quedarán asociados a la moto que registres.' }}</p>
            <ion-button class="rod-btn-primary" shape="round" routerLink="/app/garaje">
              {{ tieneMotos() ? 'Ir al garaje' : 'Registrar moto' }}
            </ion-button>
          </section>
        } @else {
          <section class="empty-state">
            <div class="empty-icon"><ion-icon name="cloud-offline-outline" aria-hidden="true"></ion-icon></div>
            <h2>No se pudieron cargar los documentos</h2>
            <p>Comprueba tu conexión e inténtalo de nuevo.</p>
            <ion-button fill="outline" (click)="cargarDocumentos()">Reintentar</ion-button>
          </section>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .documents-page { max-width: 720px; margin: auto; padding: 28px 20px 40px; }
    .eyebrow { margin: 0 0 8px; color: var(--ion-color-primary); font-size: 11px; font-weight: 700; }
    h1 { margin: 0; color: var(--rod-text-heading); font: 700 28px/1.15 var(--rod-font-heading); }
    .subtitle { margin: 8px 0 24px; color: var(--rod-text-secondary); font-size: 14px; line-height: 1.5; }
    .document-list { display: grid; }
    .document-row { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 16px 0; border-bottom: 1px solid var(--rod-border); }
    .document-icon, .empty-icon { display: grid; flex: 0 0 46px; width: 46px; height: 46px; place-items: center; border-radius: 50%; color: var(--ion-color-primary); background: color-mix(in srgb, var(--ion-color-primary) 14%, transparent); }
    .document-icon ion-icon { font-size: 23px; }
    .document-info { min-width: 0; }
    .document-info h2 { margin: 0; color: var(--rod-text-heading); font: 600 15px var(--rod-font-heading); overflow-wrap: anywhere; }
    .document-info p, .document-info span { display: block; margin: 5px 0 0; color: var(--rod-text-secondary); font-size: 12px; }
    .empty-state { display: flex; min-height: 52vh; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; }
    .empty-icon { flex-basis: 72px; width: 72px; height: 72px; }
    .empty-icon ion-icon { font-size: 36px; }
    .empty-state h2 { margin: 20px 0 0; color: var(--rod-text-heading); font: 600 20px var(--rod-font-heading); }
    .empty-state p { max-width: 290px; margin: 8px 0 20px; color: var(--rod-text-secondary); font-size: 14px; line-height: 1.5; }
  `],
})
export class DocumentsPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly supabase = inject(SupabaseService);

  readonly documentos = signal<DocumentoVista[]>([]);
  readonly cargado = signal(false);
  readonly tieneMotos = signal(false);

  ngOnInit(): void {
    void this.cargarDocumentos();
  }

  async cargarDocumentos(): Promise<void> {
    const userId = this.auth.sesion()?.userId;
    if (!userId) return;
    const loading = await this.notify.showLoading('Cargando documentos...');
    try {
      const { data, error } = await this.supabase.getMotos(userId);
      if (error) throw error;
      const motos = (data ?? []) as Moto[];
      this.tieneMotos.set(motos.length > 0);
      const grupos = await Promise.all(motos.map(async (moto) => {
        if (!moto.id) return [];
        const [otros, soat, rtm] = await Promise.all([
          this.supabase.getDocumentosPorMoto(moto.id),
          this.supabase.getSoatsPorMoto(moto.id),
          this.supabase.getRtmPorMoto(moto.id),
        ]);
        if (otros.error) throw otros.error;
        if (soat.error) throw soat.error;
        if (rtm.error) throw rtm.error;
        const motoNombre = `${moto.marca} ${moto.modelo}`;
        const genericos = (otros.data ?? []).map((row) => ({
          id: `doc-${row['id']}`, nombre: String(row['nombre'] ?? row['tipo'] ?? 'Documento'),
          moto: motoNombre, vencimiento: row['fecha_vencimiento'] ? String(row['fecha_vencimiento']) : null,
          detalle: String(row['entidad_emisora'] ?? row['tipo'] ?? 'Documento de la moto'),
        }));
        const soatRows = (soat.data ?? []).map((row) => ({
          id: `soat-${row['id']}`, nombre: 'SOAT', moto: motoNombre,
          vencimiento: row['fecha_vencimiento'] ? String(row['fecha_vencimiento']) : null,
          detalle: String(row['aseguradora'] ?? 'Seguro obligatorio'),
        }));
        const rtmRows = (rtm.data ?? []).map((row) => ({
          id: `rtm-${row['id']}`, nombre: 'Revisión técnico-mecánica', moto: motoNombre,
          vencimiento: row['fecha_vencimiento'] ? String(row['fecha_vencimiento']) : null,
          detalle: String(row['nombre_cda'] ?? 'RTM'),
        }));
        return [...genericos, ...soatRows, ...rtmRows];
      }));
      this.documentos.set(grupos.flat());
      this.cargado.set(true);
    } catch (error) {
      const message = (error as { message?: string })?.message?.toLowerCase() ?? '';
      await this.notify.error(message.includes('network') || message.includes('failed to fetch')
        ? 'Error de conexión. Revisa tu internet e intenta de nuevo.'
        : 'No se pudieron cargar los documentos. Verifica la configuración del servicio.');
    } finally {
      await loading.dismiss();
    }
  }
}