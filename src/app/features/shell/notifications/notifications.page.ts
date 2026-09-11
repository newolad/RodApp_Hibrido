import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';

interface Aviso {
  icono: string;
  color: string;
  titulo: string;
  detalle: string;
  cuando: string;
  leida: boolean;
}

/**
 * Frame Figma "Notificaciones" (7:3463).
 *
 * Alertas de vencimiento (SOAT/RTM), recordatorios de mantenimiento y avisos.
 * Scaffold con datos de ejemplo; agrupado en Nuevas / Anteriores.
 */
@Component({
  selector: 'app-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Notificaciones</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" size="small">Limpiar todo</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      @if (avisos.length === 0) {
        <div class="rod-empty">
          <ion-icon name="notifications-outline" aria-hidden="true"></ion-icon>
          <h2>Sin notificaciones</h2>
          <p>Aqui te avisaremos de vencimientos y mantenimientos proximos.</p>
        </div>
      } @else {
        <div class="rod-container">
          @for (grupo of grupos; track grupo.titulo) {
            <h3 class="grupo">{{ grupo.titulo }}</h3>
            @for (a of grupo.items; track a.titulo) {
              <div class="aviso rod-card" [class.aviso--no-leida]="!a.leida">
                <ion-icon [name]="a.icono" [style.color]="a.color" aria-hidden="true"></ion-icon>
                <div class="txt">
                  <div class="fila">
                    <span class="titulo">{{ a.titulo }}</span>
                    <span class="cuando">{{ a.cuando }}</span>
                  </div>
                  <p>{{ a.detalle }}</p>
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
      }
      .aviso--no-leida {
        border-color: var(--ion-color-primary);
      }
      .aviso > ion-icon {
        font-size: 22px;
        flex: none;
        margin-top: 2px;
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
export class NotificationsPage {
  readonly avisos: Aviso[] = [
    {
      icono: 'alert-circle-outline',
      color: 'var(--ion-color-danger)',
      titulo: 'SOAT por vencer',
      detalle: 'Tu poliza vence en 5 dias. Renueva para evitar multas.',
      cuando: 'Hace 2 h',
      leida: false,
    },
    {
      icono: 'build-outline',
      color: 'var(--ion-color-warning)',
      titulo: 'Cambio de aceite sugerido',
      detalle: 'Segun el odometro (4.850 km) toca programar el servicio.',
      cuando: 'Hoy',
      leida: false,
    },
    {
      icono: 'shield-checkmark-outline',
      color: 'var(--ion-color-success)',
      titulo: 'Tecnomecanica al dia',
      detalle: 'Tu RTM quedo registrada y vigente hasta el proximo año.',
      cuando: 'Ayer',
      leida: true,
    },
  ];

  readonly grupos = [
    { titulo: 'Nuevas', items: this.avisos.filter((a) => !a.leida) },
    { titulo: 'Anteriores', items: this.avisos.filter((a) => a.leida) },
  ].filter((g) => g.items.length > 0);
}
