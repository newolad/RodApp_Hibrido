import {
  APP_INITIALIZER,
  ApplicationConfig,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';

/**
 * Configuracion global de la aplicacion (reemplaza al antiguo AppModule).
 *
 * - `provideIonicAngular`: activa Ionic en modo standalone.
 * - `provideRouter`: enrutado con lazy-loading por componente.
 * - `APP_INITIALIZER`: antes de mostrar la UI, resuelve la sesion de Supabase
 *   (usuario que ya habia iniciado sesion) para que los guards no parpadeen.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideIonicAngular({
      mode: 'md', // misma apariencia (Material) en Android, iOS y web -> coherencia visual
    }),

    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),

    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const auth = inject(AuthService);
        return () => auth.init();
      },
    },
  ],
};
