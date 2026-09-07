import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonButton,
  IonSpinner,
} from '@ionic/angular/standalone';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { mensajeErrorAuth } from '@shared/utils/auth-error.util';

/**
 * Perfil y ajustes de cuenta.
 *
 * Muestra los datos de la sesion actual (leidos de Supabase) y contiene la
 * accion de CERRAR SESION, centralizada aqui para que exista en un unico lugar.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonButton,
    IonSpinner,
  ],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly cerrando = signal(false);

  /** Sesion compacta (nombre, correo, avatar) para la plantilla. */
  readonly sesion = this.auth.sesion;

  /** Iniciales para el avatar cuando el usuario no tiene foto. */
  readonly iniciales = computed(() => {
    const nombre = this.sesion()?.nombre ?? '';
    return (
      nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || 'RA'
    );
  });

  /** Pide confirmacion y cierra la sesion. */
  async cerrarSesion(): Promise<void> {
    const ok = await this.notify.confirm(
      'Cerrar sesion',
      '¿Seguro que quieres salir de tu cuenta?',
      'Cerrar sesion',
    );
    if (!ok) return;

    this.cerrando.set(true);
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      await this.notify.error(mensajeErrorAuth(error));
    } finally {
      this.cerrando.set(false);
    }
  }
}
