import { ChangeDetectionStrategy, Component } from '@angular/core';
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
} from '@ionic/angular/standalone';

/**
 * Frames Figma "Garaje (Sin Documentos) 1 y 2" (7:4036 / 7:4140).
 *
 * Ficha de una moto: datos principales + secciones de Documentos, Mantenimiento
 * y Combustible. Este estado muestra la moto SIN documentos cargados, con
 * accesos directos a registrar SOAT y RTM.
 * Scaffold con datos de ejemplo; la moto real vendra de la tabla `motos`.
 */
@Component({
  selector: 'app-moto-detail',
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
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/app/garaje" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Detalle de moto</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" size="small">Editar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="rod-container">
        <div class="rod-card ficha">
          <div class="foto"><ion-icon name="bicycle-outline" aria-hidden="true"></ion-icon></div>
          <div>
            <h1 class="rod-heading">Yamaha FZ 2.0</h1>
            <p class="rod-subheading">Placa ABC12D · 149 cc</p>
            <p class="km">4.850 km</p>
          </div>
        </div>

        <section>
          <div class="sec-head">
            <h2>Documentos</h2>
          </div>
          <div class="rod-empty compacto">
            <ion-icon name="document-text-outline" aria-hidden="true"></ion-icon>
            <h2>Sin documentos</h2>
            <p>Registra el SOAT y la tecnomecanica para recibir alertas de vencimiento.</p>
          </div>
          <div class="acciones">
            <ion-button
              class="rod-btn-primary"
              expand="block"
              routerLink="/app/garaje/soat/nuevo"
            >
              <ion-icon slot="start" name="shield-checkmark-outline" aria-hidden="true"></ion-icon>
              Registrar SOAT
            </ion-button>
            <ion-button
              fill="outline"
              expand="block"
              routerLink="/app/garaje/rtm/nuevo"
            >
              <ion-icon slot="start" name="document-text-outline" aria-hidden="true"></ion-icon>
              Registrar RTM
            </ion-button>
          </div>
        </section>

        <section>
          <div class="sec-head">
            <h2>Mantenimiento</h2>
            <ion-button fill="clear" size="small" routerLink="/app/mantenimiento/nuevo">
              Añadir
            </ion-button>
          </div>
          <p class="vacio-linea">Aun no hay tareas registradas.</p>
        </section>

        <section>
          <div class="sec-head">
            <h2>Combustible</h2>
            <ion-button fill="clear" size="small" routerLink="/app/combustible/nuevo">
              Añadir
            </ion-button>
          </div>
          <p class="vacio-linea">Aun no hay tanqueadas registradas.</p>
        </section>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .ficha {
        display: flex;
        gap: 16px;
        align-items: center;
        margin-bottom: 8px;
      }
      .ficha .foto {
        width: 72px;
        height: 72px;
        flex: none;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: var(--rod-bg-base);
      }
      .ficha .foto ion-icon {
        font-size: 34px;
        color: var(--ion-color-primary);
      }
      .ficha .km {
        margin: 6px 0 0;
        font-size: 13px;
        color: var(--ion-color-primary);
        font-weight: 600;
      }
      section {
        margin-top: 24px;
      }
      .sec-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .sec-head h2 {
        font-family: var(--rod-font-heading);
        font-size: 16px;
        color: var(--rod-text-heading);
        margin: 0;
      }
      .rod-empty.compacto {
        padding: 24px 16px;
      }
      .rod-empty.compacto ion-icon {
        font-size: 40px;
      }
      .acciones {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 8px;
      }
      .vacio-linea {
        font-size: 13px;
        color: var(--rod-text-secondary);
        margin: 8px 0 0;
      }
    `,
  ],
})
export class MotoDetailPage {}
