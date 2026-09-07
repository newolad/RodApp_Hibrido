import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

/**
 * Mapa de rutas de RodApp.
 *
 * Estructura:
 *   /login, /registro, /auth/callback  -> publicas (guestGuard)
 *   /app/...                           -> privadas dentro del shell de tabs (authGuard)
 *
 * Todas las paginas se cargan con `loadComponent` (lazy) para reducir el
 * bundle inicial: buena practica en apps hibridas donde el arranque importa.
 * Cada vista existe UNA sola vez (sin duplicados).
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'app/inicio',
  },

  /* ----------------------------- Auth ----------------------------- */
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    // Retorno del login con Google (OAuth) en la WEB.
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/callback/callback.page').then((m) => m.CallbackPage),
  },

  /* ------------------- App privada (shell de tabs) ---------------- */
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shell/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/shell/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'garaje',
        loadComponent: () =>
          import('./features/shell/garage/garage.page').then((m) => m.GaragePage),
      },
      {
        path: 'mapa',
        loadComponent: () =>
          import('./features/shell/map/map.page').then((m) => m.MapPage),
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./features/shell/history/history.page').then((m) => m.HistoryPage),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/shell/profile/profile.page').then((m) => m.ProfilePage),
      },
    ],
  },

  /* --------------------------- Fallback -------------------------- */
  { path: '**', redirectTo: 'app/inicio' },
];
