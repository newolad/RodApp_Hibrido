import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonButton,
  IonSpinner,
} from '@ionic/angular/standalone';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { mensajeErrorAuth } from '@shared/utils/auth-error.util';

/**
 * Pantalla de inicio de sesion.
 * Reconstruye el frame "login" del mockup de Figma (fondo #101f22, inputs
 * tipo pildora, boton primario cian) y conecta con Supabase Auth.
 *
 * Ofrece dos vias de acceso:
 *   1. Correo + contrasena  -> AuthService.loginWithEmail
 *   2. Cuenta de Google     -> AuthService.loginWithGoogle
 */
@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonButton, IonSpinner],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  /** Estado de carga (deshabilita botones y muestra spinner). */
  readonly cargando = signal(false);
  readonly verPassword = signal(false);

  /** Formulario reactivo: validacion en cliente antes de llamar al backend. */
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  /** Alterna la visibilidad del campo de contrasena. */
  togglePassword(): void {
    this.verPassword.update((v) => !v);
  }

  /** Envia credenciales a Supabase. */
  async iniciarSesion(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.notify.error('Revisa el correo y la contrasena.');
      return;
    }

    this.cargando.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.loginWithEmail(email, password);
      await this.router.navigateByUrl('/app/inicio', { replaceUrl: true });
    } catch (error) {
      await this.notify.error(mensajeErrorAuth(error));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Inicia el flujo OAuth con Google. */
  async iniciarConGoogle(): Promise<void> {
    this.cargando.set(true);
    try {
      await this.auth.loginWithGoogle();
      // Web: el navegador redirige. Nativo: se abre el navegador del sistema y
      // el retorno lo maneja AppComponent (deep link). No navegamos aqui.
    } catch (error) {
      await this.notify.error(mensajeErrorAuth(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
