import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonButton } from '@ionic/angular/standalone';

/**
 * Frame Figma "sso confirmación" (7:4336).
 *
 * Confirma que la cuenta de Google quedo vinculada tras el retorno de OAuth.
 * Scaffold: layout definitivo, copy por ajustar contra Figma.
 */
@Component({
  selector: 'app-sso-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonIcon, IonButton],
  template: `
    <ion-content class="sso-ok">
      <div class="box">
        <ion-icon name="shield-checkmark-outline" aria-hidden="true"></ion-icon>
        <h1 class="rod-heading">Cuenta vinculada</h1>
        <p class="rod-subheading">
          Tu cuenta de Google quedo conectada con RodApp.
        </p>

        <ion-button class="rod-btn-primary" expand="block" (click)="continuar()">
          Continuar
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .sso-ok {
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
      ion-icon {
        font-size: 84px;
        color: var(--ion-color-primary);
      }
      ion-button {
        margin-top: 24px;
        width: 100%;
        max-width: 320px;
      }
    `,
  ],
})
export class SsoConfirmPage {
  private readonly router = inject(Router);

  continuar(): void {
    void this.router.navigateByUrl('/app/inicio', { replaceUrl: true });
  }
}
