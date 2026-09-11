import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonButton } from '@ionic/angular/standalone';

/**
 * Frame Figma "Login exitoso" (7:4394).
 *
 * Pantalla puente que confirma el acceso antes de entrar al shell.
 * Scaffold: estructura y estilos definitivos; el copy/ilustracion se ajustan
 * cuando se recupere el detalle del frame en Figma.
 */
@Component({
  selector: 'app-login-success',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonIcon, IonButton],
  template: `
    <ion-content class="ok">
      <div class="box">
        <ion-icon name="checkmark-circle-outline" aria-hidden="true"></ion-icon>
        <h1 class="rod-heading">¡Acceso correcto!</h1>
        <p class="rod-subheading">Ya puedes gestionar tu garaje.</p>

        <ion-button
          class="rod-btn-primary"
          expand="block"
          (click)="continuar()"
        >
          Ir al inicio
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .ok {
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
        color: var(--ion-color-success);
      }
      ion-button {
        margin-top: 24px;
        width: 100%;
        max-width: 320px;
      }
    `,
  ],
})
export class LoginSuccessPage {
  private readonly router = inject(Router);

  continuar(): void {
    void this.router.navigateByUrl('/app/inicio', { replaceUrl: true });
  }
}
