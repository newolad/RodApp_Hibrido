import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';

interface Componente {
  nombre: string;
  vidaUtil: number; // 0..100 (% restante)
  detalle: string;
}

/**
 * Frame Figma "Mantenimiento y Alertas" (2:2).
 *
 * Estado de los consumibles/servicios de la moto con barra de "vida util" y
 * alertas de lo que toca pronto. Acceso al alta de nueva tarea.
 * Scaffold con datos de ejemplo.
 */
@Component({
  selector: 'app-maintenance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
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
        <ion-title>Mantenimiento</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" size="small" routerLink="/app/mantenimiento/nuevo">
            <ion-icon slot="icon-only" name="add-outline" aria-hidden="true"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-header collapse="condense" class="ion-no-border">
        <ion-toolbar>
          <ion-title size="large">Mantenimiento</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="rod-container">
        <div class="rod-card alerta">
          <ion-icon name="build-outline" aria-hidden="true"></ion-icon>
          <div>
            <strong>Cambio de aceite pronto</strong>
            <p>Faltan ~150 km para el proximo servicio recomendado.</p>
          </div>
        </div>

        <h2 class="titulo-sec">Vida util por componente</h2>

        @for (c of componentes; track c.nombre) {
          <div class="rod-card componente">
            <div class="fila">
              <span class="nombre">{{ c.nombre }}</span>
              <span class="pct" [class.pct--bajo]="c.vidaUtil <= 25">{{ c.vidaUtil }}%</span>
            </div>
            <div class="barra">
              <div
                class="relleno"
                [class.relleno--bajo]="c.vidaUtil <= 25"
                [style.width.%]="c.vidaUtil"
              ></div>
            </div>
            <p class="detalle">{{ c.detalle }}</p>
          </div>
        }

        <ion-button
          class="rod-btn-primary"
          expand="block"
          routerLink="/app/mantenimiento/nuevo"
        >
          Registrar nueva tarea
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .alerta {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        border-color: var(--ion-color-warning);
      }
      .alerta ion-icon {
        font-size: 22px;
        color: var(--ion-color-warning);
        flex: none;
      }
      .alerta strong {
        color: var(--rod-text-heading);
        font-size: 14px;
      }
      .alerta p {
        margin: 2px 0 0;
        font-size: 13px;
        color: var(--rod-text-secondary);
      }
      .titulo-sec {
        font-family: var(--rod-font-heading);
        font-size: 15px;
        color: var(--rod-text-secondary);
        margin: 22px 0 10px;
      }
      .componente {
        margin-bottom: 12px;
      }
      .componente .fila {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
      }
      .componente .nombre {
        color: var(--rod-text-heading);
        font-weight: 500;
      }
      .componente .pct {
        color: var(--ion-color-success);
        font-weight: 600;
      }
      .componente .pct--bajo {
        color: var(--ion-color-danger);
      }
      .barra {
        height: 8px;
        border-radius: 999px;
        background: var(--rod-bg-base);
        margin: 8px 0;
        overflow: hidden;
      }
      .relleno {
        height: 100%;
        border-radius: 999px;
        background: var(--ion-color-success);
      }
      .relleno--bajo {
        background: var(--ion-color-danger);
      }
      .componente .detalle {
        font-size: 12px;
        color: var(--rod-text-secondary);
        margin: 0;
      }
      ion-button.rod-btn-primary {
        margin-top: 18px;
      }
    `,
  ],
})
export class MaintenancePage {
  readonly componentes: Componente[] = [
    { nombre: 'Aceite de motor', vidaUtil: 18, detalle: 'Ultimo cambio a 4.100 km · cada 3.000 km' },
    { nombre: 'Kit de arrastre', vidaUtil: 62, detalle: 'Ultimo ajuste a 3.500 km' },
    { nombre: 'Pastillas de freno', vidaUtil: 74, detalle: 'Revisadas a 4.000 km' },
    { nombre: 'Llanta trasera', vidaUtil: 40, detalle: 'Instalada a 1.200 km' },
  ];
}
