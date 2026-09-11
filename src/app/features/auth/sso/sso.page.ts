import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/angular/standalone';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { mensajeErrorAuth } from '@shared/utils/auth-error.util';

/**
 * Frame Figma "sso" (7:4289).
 *
 * Punto de entrada del acceso con Google (SSO). Presenta la marca y lanza el
 * flujo OAuth; el retorno lo resuelve `/auth/callback`.
 * Scaffold: reutiliza `AuthService.loginConGoogle` si existe; si no, deja el
 * boton listo y un TODO.
 */
@Component({
  selector: 'app-sso',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IonContent, IonIcon, IonButton, IonSpinner],
  template: `
    <ion-content class="sso">
      <div class="box">
        <ion-icon name="log-in-outline" aria-hidden="true"></ion-icon>
        <h1 class="rod-heading">Acceso rapido</h1>
        <p class="rod-subheading">Entra con tu cuenta de Google para sincronizar tu garaje.</p>

        <ion-button
          class="rod-btn-primary"
          expand="block"
          [disabled]="cargando()"
          (click)="continuarConGoogle()"
        >
          @if (cargando()) {
            <ion-spinner name="crescent"></ion-spinner>
          } @else {
            <ion-icon slot="start" name="logo-google" aria-hidden="true"></ion-icon>
            Continuar con Google
          }
        </ion-button>

        <ion-button fill="clear" size="small" routerLink="/login">
          Volver al login
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .sso {
        --background: var(--rod-bg-base);
      }
      .box {
        min-height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 10px;
        padding: 24px;
      }
      .box > ion-icon {
        font-size: 72px;
        color: var(--ion-color-primary);
      }
      ion-button.rod-btn-primary {
        margin-top: 24px;
        width: 100%;
        max-width: 320px;
      }
    `,
  ],
})
export class SsoPage {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  readonly cargando = signal(false);

  async continuarConGoogle(): Promise<void> {
    this.cargando.set(true);
    try {
      await this.auth.loginWithGoogle();
    } catch (error) {
      await this.notify.error(mensajeErrorAuth(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
