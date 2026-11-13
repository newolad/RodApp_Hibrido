import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { SupabaseService } from '@core/services/supabase.service';
import { mensajeErrorAuth } from '@shared/utils/auth-error.util';
import { camposCoincidenValidator } from '@shared/utils/form-validators.util';

type Estado = 'verificando' | 'listo' | 'invalido';

/**
 * Paso 2 de "Olvide mi contrasena": destino del enlace del correo.
 *
 * - WEB: llega como `/auth/restablecer?code=...`. El SDK (detectSessionInUrl)
 *   canjea el `code` por una sesion de recuperacion; aqui lo reintentamos de
 *   forma idempotente por si el timing no acompana (igual que CallbackPage).
 * - NATIVO: AppComponent canjea el `code` del deep link y luego navega aqui.
 *
 * Con la sesion activa se muestra el formulario de nueva contrasena. Sin
 * sesion (enlace vencido o ya usado) se ofrece pedir uno nuevo.
 *
 * Sin guard a proposito: `guestGuard` rebotaria al usuario (ya tiene sesion
 * tras el canje) y `authGuard` podria correr antes del canje.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonButton, IonSpinner],
  templateUrl: './reset-password.page.html',
  styleUrls: ['../login/login.page.scss', '../forgot-password/forgot-password.page.scss'],
})
export class ResetPasswordPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly estado = signal<Estado>('verificando');
  readonly motivoInvalido = signal('El enlace no es valido o ya vencio.');
  readonly guardando = signal(false);
  readonly verPassword = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: camposCoincidenValidator('password', 'confirmar') },
  );

  async ngOnInit(): Promise<void> {
    try {
      const url = new URL(window.location.href);
      // Supabase devuelve los errores (p. ej. otp_expired) en la query o en el hash.
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
      const errorParam =
        url.searchParams.get('error_description') ??
        hash.get('error_description') ??
        url.searchParams.get('error') ??
        hash.get('error');
      if (errorParam) {
        this.marcarInvalido(errorParam);
        return;
      }

      const code = url.searchParams.get('code');
      if (code) {
        await this.supabase.client.auth.exchangeCodeForSession(code).catch(() => undefined);
        // Quita el `code` de la barra de direcciones (es de un solo uso).
        window.history.replaceState({}, '', url.pathname);
      }

      const { data } = await this.supabase.client.auth.getSession();
      if (data.session) {
        this.estado.set('listo');
      } else {
        this.marcarInvalido();
      }
    } catch {
      this.marcarInvalido();
    }
  }

  togglePassword(): void {
    this.verPassword.update((v) => !v);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.notify.error(
        this.form.errors?.['noCoinciden']
          ? 'Las contrasenas no coinciden.'
          : 'La contrasena debe tener al menos 6 caracteres.',
      );
      return;
    }

    this.guardando.set(true);
    try {
      await this.auth.actualizarPassword(this.form.getRawValue().password);
      await this.notify.success('Contrasena actualizada. ¡Ya puedes rodar!');
      await this.router.navigateByUrl('/app/inicio', { replaceUrl: true });
    } catch (error) {
      await this.notify.error(mensajeErrorAuth(error));
    } finally {
      this.guardando.set(false);
    }
  }

  private marcarInvalido(detalle?: string): void {
    const d = detalle?.toLowerCase() ?? '';
    if (d.includes('expired') || d.includes('invalid')) {
      this.motivoInvalido.set('El enlace vencio o ya fue usado.');
    }
    this.estado.set('invalido');
  }
}
