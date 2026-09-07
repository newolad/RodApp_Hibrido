import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Inverso de `authGuard`: impide ver login / registro si el usuario YA tiene
 * sesion activa. En ese caso lo manda directo al dashboard (`/app/inicio`).
 */
export const guestGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isReady()) {
    await new Promise<void>((resolve) => {
      const inicio = Date.now();
      const id = setInterval(() => {
        if (auth.isReady() || Date.now() - inicio > 5000) {
          clearInterval(id);
          resolve();
        }
      }, 50);
    });
  }

  return auth.isAuthenticated() ? router.createUrlTree(['/app/inicio']) : true;
};
