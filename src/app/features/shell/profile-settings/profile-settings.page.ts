import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
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

import { GarajeDatosService } from '@core/services/garaje-datos.service';
import { RecordatoriosService } from '@core/services/recordatorios.service';
import { ThemeService } from '@core/services/theme.service';

/**
 * Frame Figma "Configuración de Perfil" (2:732).
 *
 * Preferencias de la cuenta: notificaciones, tema (claro/oscuro), biometria,
 * unidades e idioma. Tema y recordatorios se guardan en el dispositivo.
 * "Recordatorios de vencimiento" ya es real (RecordatoriosService, guardado con
 * Preferences). El resto sigue en signals locales; persistirlos es el TODO.
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
          <ion-label>
            Recordatorios de vencimiento
            <p>SOAT y RTM: 30, 7 y 1 día antes, y el día del vencimiento</p>
          </ion-label>
          <ion-toggle
            slot="end"
            [checked]="recordatoriosSvc.activo()"
            (ionChange)="cambiarRecordatorios($any($event).detail.checked)"
            aria-label="Recordatorios de vencimiento"
          ></ion-toggle>
        </ion-item>
        @if (!recordatoriosSvc.disponible) {
          <p class="aviso-permiso">
            Los recordatorios llegan como notificación del teléfono: funcionan en la app de
            Android / iOS, no en el navegador.
          </p>
        } @else if (recordatoriosSvc.activo() && recordatoriosSvc.permiso() === 'denegado') {
          <p class="aviso-permiso aviso-permiso--error">
            RodApp no tiene permiso para enviar notificaciones. Actívalo en los ajustes del
            teléfono (Aplicaciones › RodApp › Notificaciones).
          </p>
        }
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

        <ion-list-header>Apariencia</ion-list-header>
        <ion-item>
          <ion-icon slot="start" name="contrast-outline" aria-hidden="true"></ion-icon>
          <ion-label>
            Tema
            <p>El modo claro se lee mejor con sol o con visor oscuro</p>
          </ion-label>
          <ion-select
            slot="end"
            interface="popover"
            aria-label="Tema"
            [value]="theme.modo()"
            (ionChange)="theme.setModo($any($event).detail.value)"
          >
            <ion-select-option value="oscuro">Oscuro</ion-select-option>
            <ion-select-option value="claro">Claro</ion-select-option>
            <ion-select-option value="sistema">Automático</ion-select-option>
          </ion-select>
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
        "Automático" sigue el modo claro u oscuro configurado en tu teléfono.
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
      .aviso-permiso {
        font-size: 12px;
        line-height: 1.5;
        color: var(--rod-text-secondary);
        padding: 8px 20px 4px;
        margin: 0;
      }
      .aviso-permiso--error {
        color: var(--ion-color-warning);
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
  readonly recordatoriosSvc = inject(RecordatoriosService);
  readonly theme = inject(ThemeService);
  private readonly garaje = inject(GarajeDatosService);
  readonly recordatorios = signal(true);
  readonly biometria = signal(false);
  readonly unidades = signal<'km' | 'mi'>('km');
  readonly idioma = signal<'es' | 'en'>('es');

  /** Guarda la preferencia y reprograma (o cancela) los avisos del telefono. */
  async cambiarRecordatorios(activo: boolean): Promise<void> {
    await this.recordatoriosSvc.setActivo(activo);
    await this.garaje.cargar();
    await this.garaje.sincronizarRecordatorios();
  }
}
