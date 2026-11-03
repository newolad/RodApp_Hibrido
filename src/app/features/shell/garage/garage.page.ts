import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/angular/standalone';

import { MotosService } from '@core/services/motos.service';

/**
 * Garaje: listado de motocicletas del usuario (tabla `motos` de Supabase).
 *
 * Estado vacio con CTA a "Registrar moto" (prerequisito de los formularios
 * de combustible/mantenimiento/SOAT/RTM) o lista simple de motos ya creadas.
 * La ficha completa por moto (documentos, mantenimiento, km real) sigue
 * pendiente en `moto-detail` (ver `mockups/VISTAS.md`, seccion 3.2/3.4).
 */
@Component({
  selector: 'app-garage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent],
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
        @if (motosService.motos().length === 0) {
          <div class="garage-empty">
            <div class="empty-icon-wrap">
              <ion-icon name="bicycle" aria-hidden="true"></ion-icon>
            </div>
            <h2 class="empty-title">Tu garaje está vacío</h2>
            <p class="empty-subtitle">
              Aquí aparecerán tus motos con su SOAT, tecnomecánica y kilometraje.
            </p>
            <ion-button class="rod-btn-primary add-moto-btn" routerLink="/app/garaje/nueva">
              Registrar moto
            </ion-button>
          </div>
        } @else {
          <div class="moto-grid">
            @for (moto of motosService.motos(); track moto.id) {
              <a class="rod-card moto" routerLink="/app/garaje/detalle">
                <div class="foto"><ion-icon name="bicycle-outline" aria-hidden="true"></ion-icon></div>
                <div>
                  <h2>{{ moto.marca }} {{ moto.modelo }}</h2>
                  <p>{{ moto.placa }} · {{ moto.odometro_inicial }} km</p>
                </div>
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
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.3px;
        color: var(--rod-text-heading);
        text-align: left;
        padding-inline-start: 12px;
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

      .empty-icon-wrap {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        background: rgba(17, 180, 212, 0.12);

        ion-icon {
          font-size: 42px;
          color: var(--ion-color-primary);
        }
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
        background: var(--rod-bg-base);
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
export class GaragePage implements OnInit {
  readonly motosService = inject(MotosService);

  ngOnInit(): void {
    void this.motosService.cargar();
  }
}
