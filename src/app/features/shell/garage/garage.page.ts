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
      <ion-toolbar>
        <ion-title>Garaje</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" size="small" routerLink="/app/garaje/nueva">
            <ion-icon slot="icon-only" name="add-outline" aria-hidden="true"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="rod-container">
        @if (motosService.motos().length === 0) {
          <div class="rod-empty">
            <ion-icon name="bicycle-outline" aria-hidden="true"></ion-icon>
            <h2>Tu garaje esta vacio</h2>
            <p>Aqui apareceran tus motos con su SOAT, tecnomecanica y kilometraje.</p>
            <ion-button class="rod-btn-primary" routerLink="/app/garaje/nueva">
              Registrar moto
            </ion-button>
          </div>
        } @else {
          @for (moto of motosService.motos(); track moto.id) {
            <a class="rod-card moto" routerLink="/app/garaje/detalle">
              <div class="foto"><ion-icon name="bicycle-outline" aria-hidden="true"></ion-icon></div>
              <div>
                <h2>{{ moto.marca }} {{ moto.modelo }}</h2>
                <p>{{ moto.placa }} · {{ moto.odometro_inicial }} km</p>
              </div>
            </a>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .rod-empty ion-button {
        margin-top: 20px;
        width: 100%;
      }
      .moto {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
        text-decoration: none;
        color: inherit;
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
