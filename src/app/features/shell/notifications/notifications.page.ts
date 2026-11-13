import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ViewWillEnter,
} from '@ionic/angular/standalone';

import { AuthService } from '@core/services/auth.service';
import { GarajeDatosService } from '@core/services/garaje-datos.service';
import { NotificationService } from '@core/services/notification.service';
import { SupabaseService } from '@core/services/supabase.service';
import { Notificacion } from '@core/models/models';
import { haceCuanto } from '@shared/utils/garaje.util';

/** Iconos permitidos para avisos guardados (los registrados en app-icons). */
const ICONO_POR_DEFECTO = 'notifications-outline';
const ICONOS_VALIDOS = new Set([
  'notifications-outline',
  'alert-circle-outline',
  'build-outline',
  'shield-checkmark-outline',
  'document-text-outline',
  'calendar-outline',
  'information-circle-outline',
  'checkmark-circle-outline',
  'water-outline',
]);

/** Colores permitidos (evita inyectar CSS arbitrario desde la base). */
const COLORES: Record<string, string> = {
  danger: 'var(--ion-color-danger)',
  warning: 'var(--ion-color-warning)',
  success: 'var(--ion-color-success)',
  primary: 'var(--ion-color-primary)',
};

/**
 * Frame Figma "Notificaciones" (7:3463).
 *
 * Dos fuentes:
 *  - **Alertas activas**: calculadas al vuelo desde los datos del garaje
 *    (documentos vencidos / por vencer, mantenimientos proximos). Desaparecen
 *    solas cuando el usuario resuelve la causa.
 *  - **Avisos**: filas de la tabla `notificaciones` (agrupadas en Nuevos /
 *    Anteriores). Se marcan como leidos al salir de la vista; "Limpiar"
 *    los borra.
 */
@Component({
  selector: 'app-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/app/perfil" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Notificaciones</ion-title>
        <ion-buttons slot="end">
          @if (avisos().length > 0) {
            <ion-button fill="clear" size="small" (click)="limpiar()">Limpiar</ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (cargando()) {
        <div class="rod-empty"><ion-spinner name="crescent"></ion-spinner></div>
      } @else if (garaje.alertas().length === 0 && avisos().length === 0) {
        <div class="rod-empty">
          <ion-icon name="notifications-outline" aria-hidden="true"></ion-icon>
          <h2>Todo al día</h2>
          <p>Aquí te avisaremos de vencimientos y mantenimientos próximos.</p>
        </div>
      } @else {
        <div class="rod-container">
          @if (garaje.alertas().length > 0) {
            <h3 class="grupo">Alertas activas</h3>
            @for (a of garaje.alertas(); track a.id) {
              <a [class]="'aviso rod-card aviso--' + a.tipo" [routerLink]="a.ruta" [queryParams]="a.query">
                <ion-icon [name]="a.icono" aria-hidden="true"></ion-icon>
                <div class="txt">
                  <span class="titulo">{{ a.titulo }}</span>
                  <p>{{ a.detalle }}</p>
                </div>
                <ion-icon class="chev" name="chevron-forward-outline" aria-hidden="true"></ion-icon>
              </a>
            }
          }

          @for (grupo of grupos(); track grupo.titulo) {
            <h3 class="grupo">{{ grupo.titulo }}</h3>
            @for (n of grupo.items; track n.id) {
              <div class="aviso rod-card" [class.aviso--no-leida]="!n.leida">
                <ion-icon [name]="icono(n)" [style.color]="color(n)" aria-hidden="true"></ion-icon>
                <div class="txt">
                  <div class="fila">
                    <span class="titulo">{{ n.titulo }}</span>
                    <span class="cuando">{{ haceCuanto(n.created_at) }}</span>
                  </div>
                  <p>{{ n.detalle }}</p>
                </div>
              </div>
            }
          }
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .grupo {
        font-size: 12px;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: var(--rod-text-secondary);
        margin: 18px 0 10px;
      }
      .aviso {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 10px;
        padding: 14px 16px;
        text-decoration: none;
        color: inherit;
      }
      .aviso--no-leida {
        border-color: var(--ion-color-primary);
      }
      .aviso--danger {
        border-color: rgba(239, 68, 68, 0.5);
      }
      .aviso--danger > ion-icon:first-child {
        color: var(--ion-color-danger);
      }
      .aviso--warn > ion-icon:first-child {
        color: var(--ion-color-warning);
      }
      .aviso > ion-icon {
        font-size: 22px;
        flex: none;
        margin-top: 2px;
      }
      .aviso .chev {
        font-size: 18px;
        align-self: center;
        color: var(--rod-text-secondary);
      }
      .aviso .txt {
        flex: 1;
        min-width: 0;
      }
      .aviso .fila {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }
      .aviso .titulo {
        font-weight: 600;
        color: var(--rod-text-heading);
        font-size: 14px;
      }
      .aviso .cuando {
        font-size: 11px;
        color: var(--rod-text-secondary);
        flex: none;
      }
      .aviso p {
        margin: 4px 0 0;
        font-size: 13px;
        color: var(--rod-text-secondary);
      }
    `,
  ],
})
export class NotificationsPage implements ViewWillEnter {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  readonly garaje = inject(GarajeDatosService);

  readonly haceCuanto = haceCuanto;

  readonly avisos = signal<Notificacion[]>([]);
  readonly cargando = signal(true);

  readonly grupos = computed(() =>
    [
      { titulo: 'Nuevos', items: this.avisos().filter((a) => !a.leida) },
      { titulo: 'Anteriores', items: this.avisos().filter((a) => a.leida) },
    ].filter((g) => g.items.length > 0),
  );

  ionViewWillEnter(): void {
    void this.cargar();
  }

  ionViewDidLeave(): void {
    // Lo visto queda leido para la proxima vez.
    void this.marcarLeidas();
  }

  async refrescar(event: CustomEvent): Promise<void> {
    await this.cargar();
    (event.target as HTMLIonRefresherElement).complete();
  }

  icono(n: Notificacion): string {
    return ICONOS_VALIDOS.has(n.icono) ? n.icono : ICONO_POR_DEFECTO;
  }

  color(n: Notificacion): string {
    return COLORES[n.color] ?? COLORES['primary'];
  }

  async limpiar(): Promise<void> {
    const userId = this.auth.sesion()?.userId;
    if (!userId) return;
    const ok = await this.notify.confirm('Limpiar avisos', '¿Borrar todos los avisos guardados?', 'Borrar');
    if (!ok) return;
    const { error } = await this.supabase.eliminarNotificaciones(userId);
    if (error) {
      await this.notify.error('No se pudieron borrar los avisos.');
      return;
    }
    this.avisos.set([]);
  }

  private async cargar(): Promise<void> {
    const userId = this.auth.sesion()?.userId;
    if (!userId) return;
    try {
      const [{ data, error }] = await Promise.all([
        this.supabase.getNotificaciones(userId),
        this.garaje.cargar(true),
      ]);
      if (error) throw error;
      this.avisos.set((data as Notificacion[]) ?? []);
    } catch (error) {
      await this.notify.error('No se pudieron cargar los avisos.');
      console.error('[NotificationsPage] cargar', error);
    } finally {
      this.cargando.set(false);
    }
  }

  private async marcarLeidas(): Promise<void> {
    const userId = this.auth.sesion()?.userId;
    if (!userId || !this.avisos().some((a) => !a.leida)) return;
    const { error } = await this.supabase.marcarNotificacionesLeidas(userId);
    if (!error) this.avisos.update((lista) => lista.map((a) => ({ ...a, leida: true })));
  }
}
