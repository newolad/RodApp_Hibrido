import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Protege las rutas privadas (todo lo que cuelga de `/app`).
 * Si no hay sesion, redirige a `/login`.
 *
 * Espera a que `AuthService.init()` termine (`isReady`) para no rebotar al
 * usuario mientras se restaura la sesion persistida.
 */
export const authGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await esperarInicializacion(auth);

  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

/** Bloquea hasta que `isReady()` sea true (con un tope de seguridad). */
function esperarInicializacion(auth: AuthService): Promise<void> {
  if (auth.isReady()) return Promise.resolve();
  return new Promise((resolve) => {
    const inicio = Date.now();
    const id = setInterval(() => {
      if (auth.isReady() || Date.now() - inicio > 5000) {
        clearInterval(id);
        resolve();
      }
    }, 50);
  });
}
