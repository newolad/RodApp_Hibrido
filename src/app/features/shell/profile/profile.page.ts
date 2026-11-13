import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';

import { AuthService } from '@core/services/auth.service';
import { MotosService } from '@core/services/motos.service';
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
    RouterLink,
    IonHeader,
    IonToolbar,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly motos = inject(MotosService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly cerrando = signal(false);

  /** Sesion compacta (nombre, correo, avatar) para la plantilla. */
  readonly sesion = this.auth.sesion;
  /** Muestra el acceso al panel de administrador solo a `rol = 'admin'`. */
  readonly isAdmin = this.auth.isAdmin;

  /** Bajo el nombre: moto principal ("Yamaha MT-09 · BGT-123") o el correo. */
  readonly subtitulo = computed(() => {
    const moto = this.motos.motoActiva();
    if (moto) return `${moto.marca} ${moto.modelo} · ${moto.placa}`;
    return this.sesion()?.email ?? '';
  });

  ngOnInit(): void {
    if (!this.motos.cargado()) void this.motos.cargar();
  }

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
