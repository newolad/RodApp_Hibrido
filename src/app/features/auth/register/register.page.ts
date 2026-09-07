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
import { camposCoincidenValidator } from '@shared/utils/form-validators.util';

/**
 * Pantalla de creacion de cuenta.
 * Reconstruye el frame "Crear Cuenta" del mockup (fondo #1e2124, inputs tipo
 * tarjeta). Crea el usuario en Supabase Auth y su perfil en la tabla `users`.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonButton, IonSpinner],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly verPassword = signal(false);

  /** Formulario con validacion de coincidencia de contrasenas a nivel de grupo. */
  readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: camposCoincidenValidator('password', 'confirmar') },
  );

  togglePassword(): void {
    this.verPassword.update((v) => !v);
  }

  /** Crea la cuenta y redirige (o informa que debe confirmar el correo). */
  async registrar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const msg = this.form.errors?.['noCoinciden']
        ? 'Las contrasenas no coinciden.'
        : 'Completa todos los campos correctamente.';
      await this.notify.error(msg);
      return;
    }

    this.cargando.set(true);
    try {
      const v = this.form.getRawValue();
      const { needsEmailConfirmation } = await this.auth.registerWithEmail({
        nombre: v.nombre,
        apellido: v.apellido || null,
        email: v.email,
        password: v.password,
      });

      if (needsEmailConfirmation) {
        await this.notify.info('Cuenta creada. Revisa tu correo para confirmarla.');
        await this.router.navigateByUrl('/login', { replaceUrl: true });
      } else {
        await this.notify.success('¡Bienvenido a RodApp!');
        await this.router.navigateByUrl('/app/inicio', { replaceUrl: true });
      }
    } catch (error) {
      await this.notify.error(mensajeErrorAuth(error));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Registro/acceso directo con Google (mismo flujo que en login). */
  async registrarConGoogle(): Promise<void> {
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
