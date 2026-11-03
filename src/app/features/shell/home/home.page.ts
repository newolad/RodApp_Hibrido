import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';

import { AuthService } from '@core/services/auth.service';

/**
 * Dashboard "Inicio".
 *
 * Por ahora solo saluda al usuario autenticado (dato real leido de la sesion
 * de Supabase) y deja el area de resumen preparada. Los widgets de vencimientos,
 * gastos y mantenimiento se anadiran aqui reutilizando el mismo <ion-header>.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="home-toolbar">
        <ion-title class="home-title">Inicio</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="home-content">
      <div class="rod-container">
        <div class="user-greeting">
          <p class="saludo">Hola,</p>
          <h1 class="rod-heading">{{ nombre() }}</h1>
          <p class="rod-subheading">Este es el resumen de tu garaje.</p>
        </div>

        <div class="home-empty">
          <div class="empty-icon-wrap">
            <ion-icon name="home" aria-hidden="true"></ion-icon>
          </div>
          <h2 class="empty-title">Aún no hay datos</h2>
          <p class="empty-subtitle">
            Registra tu primera moto en la pestaña "Garaje" para ver aquí sus vencimientos y gastos.
          </p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .home-toolbar {
        --background: var(--rod-bg-base);
        --color: var(--rod-text-heading);
        padding: 8px 12px;
      }

      .home-title {
        font-family: var(--rod-font-heading);
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.3px;
        color: var(--rod-text-heading);
        text-align: left;
        padding-inline-start: 12px;
      }

      .home-content {
        --background: var(--rod-bg-base);
      }

      .user-greeting {
        margin-bottom: 24px;
      }

      .saludo {
        margin: 4px 0 0;
        font-size: 15px;
        color: var(--rod-text-secondary);
      }

      .rod-heading {
        margin-top: 2px;
        font-size: 28px;
        font-weight: 700;
      }

      .rod-subheading {
        margin-top: 4px;
      }

      .home-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        min-height: 50vh;
        max-width: 420px;
        margin: 0 auto;
        padding: 30px 20px;
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
        max-width: 290px;
      }
    `,
  ],
})
export class HomePage {
  private readonly auth = inject(AuthService);

  /** Nombre del usuario actual (o un valor neutro mientras carga el perfil). */
  readonly nombre = computed(() => this.auth.sesion()?.nombre ?? 'Motero');
}
