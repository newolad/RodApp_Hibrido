import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Solo deja entrar al panel de administrador a usuarios con `rol = 'admin'`.
 * Es una barrera de UX: la autorizacion real la hacen las RPC en Supabase.
 * Se usa debajo de `/app`, que ya exige sesion (`authGuard`).
 */
export const adminGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.esperarPerfil();
  return auth.isAdmin() ? true : router.createUrlTree(['/app/inicio']);
};
