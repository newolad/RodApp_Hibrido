import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonIcon,
  IonToggle,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';

/**
 * Frame Figma "Configuración de Perfil" (2:732).
 *
 * Preferencias de la cuenta: notificaciones, biometria, tema, unidades e idioma.
 * Scaffold: la UI queda cableada a signals locales; persistir las preferencias
 * (Preferences de Capacitor / tabla de settings) es el TODO.
 */
@Component({
  selector: 'app-profile-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonIcon,
    IonToggle,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/app/perfil" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Ajustes</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-list lines="full" class="ajustes">
        <ion-list-header>Notificaciones</ion-list-header>
        <ion-item>
          <ion-icon slot="start" name="notifications-outline" aria-hidden="true"></ion-icon>
          <ion-label>Alertas de vencimiento</ion-label>
          <ion-toggle
            slot="end"
            [checked]="alertas()"
            (ionChange)="alertas.set($any($event).detail.checked)"
          ></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-icon slot="start" name="build-outline" aria-hidden="true"></ion-icon>
          <ion-label>Recordatorios de mantenimiento</ion-label>
          <ion-toggle
            slot="end"
            [checked]="recordatorios()"
            (ionChange)="recordatorios.set($any($event).detail.checked)"
          ></ion-toggle>
        </ion-item>

        <ion-list-header>Seguridad</ion-list-header>
        <ion-item>
          <ion-icon slot="start" name="shield-checkmark-outline" aria-hidden="true"></ion-icon>
          <ion-label>Desbloqueo biometrico</ion-label>
          <ion-toggle
            slot="end"
            [checked]="biometria()"
            (ionChange)="biometria.set($any($event).detail.checked)"
          ></ion-toggle>
        </ion-item>

        <ion-list-header>Preferencias</ion-list-header>
        <ion-item>
          <ion-icon slot="start" name="settings-outline" aria-hidden="true"></ion-icon>
          <ion-label>Unidades</ion-label>
          <ion-select
            slot="end"
            interface="popover"
            [value]="unidades()"
            (ionChange)="unidades.set($any($event).detail.value)"
          >
            <ion-select-option value="km">Kilometros</ion-select-option>
            <ion-select-option value="mi">Millas</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-icon slot="start" name="bulb-outline" aria-hidden="true"></ion-icon>
          <ion-label>Idioma</ion-label>
          <ion-select
            slot="end"
            interface="popover"
            [value]="idioma()"
            (ionChange)="idioma.set($any($event).detail.value)"
          >
            <ion-select-option value="es">Español</ion-select-option>
            <ion-select-option value="en">English</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <p class="nota">
        RodApp usa un unico tema oscuro por coherencia visual, por eso no hay
        selector de tema.
      </p>
    </ion-content>
  `,
  styles: [
    `
      .ajustes {
        background: transparent;
      }
      .ajustes ion-item {
        --background: transparent;
      }
      .ajustes ion-icon {
        color: var(--ion-color-primary);
      }
      .nota {
        font-size: 12px;
        color: var(--rod-text-secondary);
        padding: 16px 20px 32px;
        margin: 0;
      }
    `,
  ],
})
export class ProfileSettingsPage {
  readonly alertas = signal(true);
  readonly recordatorios = signal(true);
  readonly biometria = signal(false);
  readonly unidades = signal<'km' | 'mi'>('km');
  readonly idioma = signal<'es' | 'en'>('es');
}
