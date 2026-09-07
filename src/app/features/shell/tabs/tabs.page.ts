import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';

/**
 * Shell privado de la app: barra de 5 tabs del mockup de Figma
 * (Inicio - Garaje - Mapa - Historial - Perfil).
 *
 * Es el unico lugar donde se define la navegacion principal; cada vista hija
 * se renderiza en el `ion-router-outlet` interno de `ion-tabs`.
 * Los iconos usan el par outline/relleno para marcar el tab activo (coherencia).
 */
@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="inicio">
          <ion-icon aria-hidden="true" name="home-outline"></ion-icon>
          <ion-label>Inicio</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="garaje">
          <ion-icon aria-hidden="true" name="bicycle-outline"></ion-icon>
          <ion-label>Garaje</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="mapa">
          <ion-icon aria-hidden="true" name="map-outline"></ion-icon>
          <ion-label>Mapa</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="historial">
          <ion-icon aria-hidden="true" name="time-outline"></ion-icon>
          <ion-label>Historial</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="perfil">
          <ion-icon aria-hidden="true" name="person-outline"></ion-icon>
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {}
