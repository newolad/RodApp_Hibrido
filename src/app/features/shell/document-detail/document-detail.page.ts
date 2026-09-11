import { ChangeDetectionStrategy, Component } from '@angular/core';
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

interface Dato {
  etiqueta: string;
  valor: string;
}

/**
 * Frame Figma "Detalle Documento RTM" (2:1410).
 *
 * Ficha de un documento legal (RTM en este caso): datos, estado de vigencia y
 * acciones (editar / eliminar / renovar).
 * Scaffold con datos de ejemplo; el documento real vendra de la tabla `rtm`.
 */
@Component({
  selector: 'app-document-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
          <ion-back-button defaultHref="/app/garaje/detalle" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Documento</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="rod-container">
        <div class="cabecera">
          <ion-icon name="document-text-outline" aria-hidden="true"></ion-icon>
          <div>
            <h1 class="rod-heading">Tecnomecanica (RTM)</h1>
            <span class="badge badge--ok">Vigente · 214 dias</span>
          </div>
        </div>

        <div class="rod-card datos">
          @for (d of datos; track d.etiqueta) {
            <div class="fila">
              <span class="k">{{ d.etiqueta }}</span>
              <span class="v">{{ d.valor }}</span>
            </div>
          }
        </div>

        <div class="acciones">
          <ion-button fill="outline" expand="block">
            <ion-icon slot="start" name="create-outline" aria-hidden="true"></ion-icon>
            Editar
          </ion-button>
          <ion-button color="danger" fill="clear" expand="block">
            <ion-icon slot="start" name="trash-outline" aria-hidden="true"></ion-icon>
            Eliminar
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .cabecera {
        display: flex;
        gap: 14px;
        align-items: center;
        margin-bottom: 16px;
      }
      .cabecera ion-icon {
        font-size: 40px;
        color: var(--ion-color-primary);
        flex: none;
      }
      .badge {
        display: inline-block;
        margin-top: 6px;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 999px;
      }
      .badge--ok {
        background: rgba(34, 197, 94, 0.15);
        color: var(--ion-color-success);
      }
      .datos .fila {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--rod-border);
        font-size: 14px;
      }
      .datos .fila:last-child {
        border-bottom: 0;
      }
      .datos .k {
        color: var(--rod-text-secondary);
      }
      .datos .v {
        color: var(--rod-text-heading);
        font-weight: 500;
        text-align: right;
      }
      .acciones {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
    `,
  ],
})
export class DocumentDetailPage {
  readonly datos: Dato[] = [
    { etiqueta: 'Numero de certificado', valor: 'RTM-0099887' },
    { etiqueta: 'CDA', valor: 'Tecnicontrol Norte' },
    { etiqueta: 'Fecha de expedicion', valor: '2026-02-14' },
    { etiqueta: 'Fecha de vencimiento', valor: '2027-02-14' },
    { etiqueta: 'Moto', valor: 'Yamaha FZ 2.0 · ABC12D' },
  ];
}
