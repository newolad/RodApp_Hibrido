import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { mensajeErrorAuth } from '@shared/utils/auth-error.util';

/**
 * Paso 1 de "Olvide mi contrasena": el usuario escribe su correo y Supabase
 * le envia un enlace de recuperacion. Reutiliza los estilos del login para
 * mantener la misma identidad visual.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonButton, IonSpinner],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['../login/login.page.scss', './forgot-password.page.scss'],
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  readonly cargando = signal(false);
  /** Correo al que se envio el enlace (muestra la pantalla de confirmacion). */
  readonly enviadoA = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.notify.error('Escribe un correo valido.');
      return;
    }

    this.cargando.set(true);
    try {
      const { email } = this.form.getRawValue();
      await this.auth.solicitarRecuperacion(email);
      this.enviadoA.set(email.trim());
    } catch (error) {
      await this.notify.error(mensajeErrorAuth(error));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Vuelve al formulario para corregir el correo o reenviar el enlace. */
  reintentar(): void {
    this.enviadoA.set(null);
  }
}
