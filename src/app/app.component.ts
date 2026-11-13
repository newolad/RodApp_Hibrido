import { Component, NgZone, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { RecordatoriosService } from './core/services/recordatorios.service';
import { mensajeErrorAuth } from './shared/utils/auth-error.util';
import { registrarIconos } from './shared/ui/app-icons';

/**
 * Componente raiz. Solo monta el contenedor de Ionic y el router-outlet;
 * toda la navegacion vive en las rutas.
 *
 * Responsabilidades:
 *  - Registrar el set de iconos de la app (una sola vez).
 *  - Escuchar el deep link `com.rodapp.hibrido://auth/callback` en NATIVO
 *    para completar el login con Google.
 *  - Iniciar los recordatorios locales de vencimiento (SOAT / RTM).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly recordatorios = inject(RecordatoriosService);

  constructor() {
    registrarIconos();
  }

  ngOnInit(): void {
    // Recordatorios locales de vencimiento (canal Android + tap en el aviso).
    void this.recordatorios.init();

    if (Capacitor.isNativePlatform()) {
      this.escucharDeepLinks();
    }
  }

  /**
   * Captura el retorno de Google (OAuth) en Android / iOS.
   * Capacitor abre la app con una URL tipo:
   *   com.rodapp.hibrido://auth/callback?code=XXXX
   * Se lo pasamos a `AuthService.completeOAuthFromUrl` para canjear el codigo.
   */
  private escucharDeepLinks(): void {
    CapacitorApp.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
      // Enlace de "recuperar contrasena": canjear el code y pedir la nueva clave.
      if (event.url.includes('auth/restablecer')) {
        await this.zone.run(async () => {
          try {
            await this.auth.canjearCodigoDeUrl(event.url);
          } catch {
            // ResetPasswordPage detecta la falta de sesion y ofrece pedir otro enlace.
          }
          await this.router.navigateByUrl('/auth/restablecer', { replaceUrl: true });
        });
        return;
      }

      if (!event.url.includes('auth/callback')) return;

      // El listener corre fuera de la zona de Angular -> lo reingresamos
      // para que la navegacion y los signals actualicen la vista.
      await this.zone.run(async () => {
        try {
          await this.auth.completeOAuthFromUrl(event.url);
          await this.router.navigateByUrl('/app/inicio', { replaceUrl: true });
        } catch (error) {
          await this.notify.error(mensajeErrorAuth(error));
          await this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      });
    });
  }
}
