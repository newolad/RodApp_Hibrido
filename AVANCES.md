# RodApp Híbrido — Avances

## Contexto

Migración de RodApp (nativa Android → web → **híbrida**) a un único código base
**Ionic 8 + Angular 18 + Capacitor 6**, con **Supabase** como backend único.
Alcance de referencia: el mockup de Figma "RodApp" (5 pestañas, tema oscuro
`#101f22` / acento cian `#11b4d4`, tipografía Inter).

Se reutilizó del trabajo previo: los design tokens de Figma, los modelos
traducidos del Android original, el servicio de Supabase con sus consultas y las
pantallas de login / registro (rehechas con formularios reactivos y la API
standalone de Ionic).

## Hecho en esta entrega

### Base del proyecto híbrido
- [x] Scaffold Ionic + Angular standalone (sin NgModules): `package.json`,
      `angular.json` (salida a `www`), `tsconfig*`, `ionic.config.json`.
- [x] `capacitor.config.ts` (appId `com.rodapp.hibrido`, deep link para OAuth).
- [x] Tema global oscuro desde tokens de Figma (`src/theme/variables.scss`) +
      utilidades compartidas (`src/global.scss`).
- [x] PWA: `manifest.webmanifest`, meta tags, íconos.
- [x] Alias de rutas TS (`@core`, `@shared`, `@features`, `@env`).
- [x] Registro central de iconos (`shared/ui/app-icons.ts`) → coherencia.

### Autenticación (Supabase) — completa
- [x] `SupabaseService`: cliente único, PKCE, storage por plataforma
      (localStorage web / `@capacitor/preferences` nativo), `detectSessionInUrl`
      solo en web.
- [x] `AuthService` con estado reactivo (signals): `init()`, `registerWithEmail()`,
      `loginWithEmail()`, `loginWithGoogle()` (web + nativo),
      `completeOAuthFromUrl()` (deep link), `logout()`.
- [x] Registro: crea el usuario en `auth.users` y su fila en `users` (`upsertPerfil`).
- [x] Login con Google: redirect en web, `@capacitor/browser` + deep link en móvil
      (capturado en `AppComponent`).
- [x] Página puente `/auth/callback` para el retorno OAuth en web.
- [x] Cerrar sesión desde *Perfil*, con diálogo de confirmación.
- [x] Guards: `authGuard` (rutas privadas) y `guestGuard` (oculta login si ya hay sesión).
- [x] `APP_INITIALIZER` resuelve la sesión persistida antes de pintar la UI.
- [x] Formularios reactivos con validación en cliente + mapeo de errores de
      Supabase a mensajes en español.

### Vistas (sin duplicados)
- [x] Login  (`features/auth/login`)
- [x] Registro  (`features/auth/register`)
- [x] Shell de 5 tabs  (`features/shell/tabs`)
- [x] Inicio — saludo con datos reales de la sesión + estado vacío
- [x] Garaje / Mapa / Historial — placeholder coherente (`SectionPlaceholderComponent`)
- [x] Perfil — tarjeta de identidad + accesos + **cerrar sesión**

### Backend
- [x] Carpeta `supabase/` con `config.toml` (Auth + redirects + Google),
      `migrations/`, `functions/`, `seed.sql`, `README.md`.
- [x] **Sin esquema SQL todavía** (por diseño). El frontend ya está listo para consumirlo.

## Pendiente

### Configuración (fuera del código)
- [ ] Poner URL + `anon key` reales en `src/environments/environment*.ts`.
- [ ] En Supabase: registrar Redirect URLs y habilitar el proveedor Google.
- [ ] `npx cap add android` / `ios` y declarar el esquema de deep link en cada plataforma.

### Backend (Supabase)
- [ ] Migración inicial: `users`, `motos`, `soat`, `rtm`, `documentos`,
      `registros_combustible`, `registros_mantenimiento` — **con RLS + políticas por `auth.uid()`**.
- [ ] Trigger `on auth.users insert` → fila en `users` (hoy lo hace el cliente).
- [ ] Tablas nuevas del alcance Figma: `notificaciones`, `consejos`.

### Funcionalidad (siguientes módulos, reutilizando el shell actual)
- [ ] Garaje: CRUD de motos + registro de moto.
- [ ] SOAT / RTM / documentos: alta y detalle.
- [ ] Inicio: widgets de vencimientos y gastos.
- [ ] Combustible / Mantenimiento: registro y cálculo de consumo.
- [ ] Historial real (combina combustible + mantenimiento).
- [ ] Perfil: edición de datos, recuperación de contraseña.
- [ ] Mapa: elegir proveedor (Google Places / Mapbox) e integrarlo.
- [ ] Extras Figma: notificaciones, consejos, biometría (`@capacitor` biometric).
