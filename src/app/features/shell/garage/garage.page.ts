import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSpinner,
  ViewWillEnter,
} from '@ionic/angular/standalone';

import { MotosService } from '@core/services/motos.service';
import { GarajeDatosService } from '@core/services/garaje-datos.service';
import { formatoKm } from '@shared/utils/garaje.util';

/**
 * Garaje: listado de motocicletas del usuario (tabla `motos` de Supabase).
 *
 * Estado vacio con CTA a "Registrar moto" (prerequisito de los formularios
 * de combustible/mantenimiento/SOAT/RTM) o lista simple de motos ya creadas.
 * Cada tarjeta muestra el km actual estimado y abre la ficha `garaje/detalle/:id`.
 */
@Component({
  selector: 'app-garage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="garage-toolbar">
        <ion-title class="garage-title">Garaje</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" size="small" routerLink="/app/garaje/nueva" aria-label="Añadir moto">
            <ion-icon slot="icon-only" name="add-outline" aria-hidden="true"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="garage-content">
      <div class="rod-container">
        @if (!motosService.cargado()) {
          <div class="garage-empty"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (motosService.motos().length === 0) {
          <div class="garage-empty">
            <div class="rod-rings" aria-hidden="true">
              <ion-icon name="home-outline"></ion-icon>
              <span class="rod-rings-badge"><ion-icon name="bicycle"></ion-icon></span>
            </div>
            <h2 class="empty-title">Tu garaje está vacío</h2>
            <p class="empty-subtitle">
              Registra tu primera motocicleta para empezar a gestionar sus documentos y mantenimiento.
            </p>
            <ion-button shape="round" class="rod-btn-primary add-moto-btn" routerLink="/app/garaje/nueva">
              <ion-icon slot="start" name="add-circle-outline" aria-hidden="true"></ion-icon>
              Registrar motocicleta
            </ion-button>
          </div>
        } @else {
          <div class="moto-grid">
            @for (moto of motosService.motos(); track moto.id) {
              <a class="rod-card moto" [routerLink]="['/app/garaje/detalle', moto.id]">
                <div class="foto"><ion-icon name="bicycle" aria-hidden="true"></ion-icon></div>
                <div class="moto-text">
                  <h2>{{ moto.marca }} {{ moto.modelo }}</h2>
                  <p>{{ formatoKm(datos.kmActualDe(moto)) }}{{ moto.cilindrada ? ' · ' + moto.cilindrada + ' cc' : '' }}</p>
                </div>
                <span class="plate">{{ moto.placa }}</span>
              </a>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .garage-toolbar {
        --background: var(--rod-bg-base);
        --color: var(--rod-text-heading);
        padding: 8px 12px;
      }

      .garage-title {
        font-family: var(--rod-font-heading);
        font-size: 17px;
        font-weight: 600;
        color: var(--rod-text-heading);
        text-align: center;
      }

      .garage-content {
        --background: var(--rod-bg-base);
      }

      .garage-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        min-height: 60vh;
        max-width: 420px;
        margin: 0 auto;
        padding: 40px 20px;
      }

      .empty-title {
        font-family: var(--rod-font-heading);
        font-size: 20px;
        font-weight: 700;
        color: var(--rod-text-heading);
        margin: 0 0 10px;
      }

      .empty-subtitle {
        font-family: var(--rod-font-body);
        font-size: 14px;
        line-height: 1.5;
        color: var(--rod-text-secondary);
        margin: 0 0 32px;
        max-width: 290px;
      }

      .add-moto-btn {
        width: 100%;
        max-width: 320px;
      }

      .moto-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }

      .moto {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
        text-decoration: none;
        color: inherit;
        transition: transform 0.2s ease, border-color 0.2s ease;

        &:hover {
          border-color: rgba(17, 180, 212, 0.4);
          transform: translateY(-2px);
        }
      }
      .moto .foto {
        width: 56px;
        height: 56px;
        flex: none;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: var(--rod-accent-soft);
      }
      .moto .moto-text {
        flex: 1;
        min-width: 0;
      }
      .plate {
        flex: none;
        padding: 3px 8px;
        border-radius: 6px;
        background: #f5c518;
        border: 1.5px solid #1a1c1e;
        color: #1a1c1e;
        font-family: var(--rod-font-heading);
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 1px;
      }
      .moto .foto ion-icon {
        font-size: 28px;
        color: var(--ion-color-primary);
      }
      .moto h2 {
        font-family: var(--rod-font-heading);
        font-size: 16px;
        color: var(--rod-text-heading);
        margin: 0;
      }
      .moto p {
        margin: 2px 0 0;
        font-size: 13px;
        color: var(--rod-text-secondary);
      }
    `,
  ],
})
export class GaragePage implements ViewWillEnter {
  readonly motosService = inject(MotosService);
  readonly datos = inject(GarajeDatosService);
  readonly formatoKm = formatoKm;

  ionViewWillEnter(): void {
    // Recarga al volver (p. ej. tras registrar una moto o una tanqueada).
    void this.datos.cargar(true);
  }
}
