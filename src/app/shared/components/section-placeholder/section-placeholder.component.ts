import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';

/**
 * Contenedor reutilizable para vistas vacías o en construcción con el diseño de Figma.
 */
@Component({
  selector: 'app-section-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="section-toolbar">
        <ion-title class="section-title">{{ titulo }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="section-content">
      <div class="rod-container">
        <div class="section-empty">
          <div class="empty-icon-wrap">
            <ion-icon [name]="icono" aria-hidden="true"></ion-icon>
          </div>
          <h2 class="empty-title">{{ tituloVacio }}</h2>
          <p class="empty-subtitle">{{ descripcion }}</p>
          <ng-content></ng-content>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .section-toolbar {
        --background: var(--rod-bg-base);
        --color: var(--rod-text-heading);
        padding: 8px 12px;
      }

      .section-title {
        font-family: var(--rod-font-heading);
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.3px;
        color: var(--rod-text-heading);
        text-align: left;
        padding-inline-start: 12px;
      }

      .section-content {
        --background: var(--rod-bg-base);
      }

      .section-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        min-height: 60vh;
        max-width: 440px;
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
          font-size: 40px;
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
        margin: 0;
        max-width: 300px;
      }
    `,
  ],
})
export class SectionPlaceholderComponent {
  @Input({ required: true }) titulo!: string;
  @Input({ required: true }) icono!: string;
  @Input() tituloVacio = 'Próximamente';
  @Input() descripcion = 'Este módulo está en construcción.';
}
