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
  {
    // Frame Figma "Login exitoso": puente de confirmacion tras autenticarse.
    path: 'login-exitoso',
    loadComponent: () =>
      import('./features/auth/login-success/login-success.page').then(
        (m) => m.LoginSuccessPage,
      ),
  },
  {
    // Frame Figma "sso": entrada al acceso con Google.
    path: 'sso',
    loadComponent: () =>
      import('./features/auth/sso/sso.page').then((m) => m.SsoPage),
  },
  {
    // Frame Figma "sso confirmación": cuenta de Google vinculada.
    path: 'sso/confirmacion',
    loadComponent: () =>
      import('./features/auth/sso-confirm/sso-confirm.page').then(
        (m) => m.SsoConfirmPage,
      ),
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

      /* --- Vistas de detalle / formulario (frames de Figma, fuera de los 5 tabs) --- */
      {
        // Frame "Configuración de Perfil"
        path: 'perfil/ajustes',
        loadComponent: () =>
          import('./features/shell/profile-settings/profile-settings.page').then(
            (m) => m.ProfileSettingsPage,
          ),
      },
      {
        // Frame "Consejos" (consejos para moteros)
        path: 'consejos',
        loadComponent: () =>
          import('./features/shell/tips/tips.page').then((m) => m.TipsPage),
      },
      {
        // Frame "Notificaciones"
        path: 'notificaciones',
        loadComponent: () =>
          import('./features/shell/notifications/notifications.page').then(
            (m) => m.NotificationsPage,
          ),
      },
      {
        // Frame "Mantenimiento y Alertas"
        path: 'mantenimiento',
        loadComponent: () =>
          import('./features/shell/maintenance/maintenance.page').then(
            (m) => m.MaintenancePage,
          ),
      },
      {
        // Frame "Registro de Nueva Tarea"
        path: 'mantenimiento/nuevo',
        loadComponent: () =>
          import(
            './features/shell/maintenance-task-form/maintenance-task-form.page'
          ).then((m) => m.MaintenanceTaskFormPage),
      },
      {
        // Frames "Formulario de Combustible" / "Registro de Combustible"
        path: 'combustible/nuevo',
        loadComponent: () =>
          import('./features/shell/fuel-form/fuel-form.page').then(
            (m) => m.FuelFormPage,
          ),
      },
      {
        // Frames "Garaje (Sin Documentos) 1 y 2" (detalle de moto)
        path: 'garaje/detalle',
        loadComponent: () =>
          import('./features/shell/moto-detail/moto-detail.page').then(
            (m) => m.MotoDetailPage,
          ),
      },
      {
        // Frame "Plantilla reg SOAT"
        path: 'garaje/soat/nuevo',
        loadComponent: () =>
          import('./features/shell/soat-form/soat-form.page').then(
            (m) => m.SoatFormPage,
          ),
      },
      {
        // Frame "Plantilla reg RTM"
        path: 'garaje/rtm/nuevo',
        loadComponent: () =>
          import('./features/shell/rtm-form/rtm-form.page').then(
            (m) => m.RtmFormPage,
          ),
      },
      {
        // Frame "Detalle Documento RTM"
        path: 'documentos/detalle',
        loadComponent: () =>
          import('./features/shell/document-detail/document-detail.page').then(
            (m) => m.DocumentDetailPage,
          ),
      },
    ],
  },

  /* --------------------------- Fallback -------------------------- */
  { path: '**', redirectTo: 'app/inicio' },
];
