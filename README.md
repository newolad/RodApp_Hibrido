# RodApp Híbrido

Tercera iteración de **RodApp** (gestión de motocicletas): tras la app nativa
Android y la versión web, esta es la versión **híbrida** — un único código base
que se despliega como **app móvil (Android / iOS)** y como **PWA web**.

| Capa | Tecnología |
|---|---|
| UI | **Ionic 8** (componentes standalone) + **Angular 18** (standalone, sin NgModules) |
| Capa nativa | **Capacitor 6** (Android / iOS) |
| Backend | **Supabase** (Auth + Postgres + Storage) — ver [`supabase/README.md`](supabase/README.md) |
| Estado | Angular **signals** |

## Qué incluye esta entrega

- Estructura completa del proyecto híbrido (web + móvil desde el mismo código).
- **Autenticación con Supabase, funcionando de punta a punta:**
  - Registro con correo y contraseña (+ creación del perfil en la tabla `users`).
  - Inicio de sesión con correo y contraseña.
  - Inicio de sesión / registro con **cuenta de Google** (OAuth), con flujo
    distinto para web (redirect) y para móvil (deep link `com.rodapp.hibrido://`).
  - **Cerrar sesión** (desde *Perfil*), con confirmación.
  - Persistencia de sesión: `localStorage` en web, `@capacitor/preferences` en nativo.
  - Guards de ruta (`authGuard` / `guestGuard`).
- Shell de navegación con las **5 pestañas** del mockup (Inicio · Garaje · Mapa ·
  Historial · Perfil). Cada vista existe **una sola vez**; las que aún no tienen
  datos comparten un componente de estado vacío para mantener la coherencia visual.
- **Esquema de base de datos aplicado** en Supabase (9 tablas + RLS, ver
  [`supabase/README.md`](supabase/README.md)). Alta de moto y los 4 formularios
  de registro (combustible, mantenimiento, SOAT, RTM) ya persisten datos reales.
- Edición de datos personales y pantalla de Ajustes del Perfil, funcionando.

## Requisitos

- **Node.js 20** (ver `.nvmrc`)
- npm 10+
- Para compilar a móvil: **Android Studio** (Android) y/o **Xcode** (iOS)

## Puesta en marcha (web)

```bash
npm install
npm start            # http://localhost:8100
```

Antes de probar el login, edita `src/environments/environment.ts` con la URL y la
`anon key` de tu proyecto Supabase, y registra las *Redirect URLs* (ver
`supabase/README.md`).

## Compilar y ejecutar en móvil

```bash
npm run build                    # genera /www
npx cap add android              # solo la primera vez
npx cap add ios                  # solo la primera vez (macOS)
npm run android                  # build + sync + abre Android Studio
npm run ios                      # build + sync + abre Xcode
```

### Deep link para el login con Google (nativo)

El retorno de Google llega a `com.rodapp.hibrido://auth/callback`. Hay que
declarar el esquema en cada plataforma:

- **Android** — `android/app/src/main/AndroidManifest.xml`, dentro de la
  `activity` principal:

  ```xml
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.rodapp.hibrido" android:host="auth" />
  </intent-filter>
  ```

- **iOS** — `ios/App/App/Info.plist`:

  ```xml
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLSchemes</key>
      <array><string>com.rodapp.hibrido</string></array>
    </dict>
  </array>
  ```

## Estructura del código

```
src/app/
├── core/                     # Servicios singleton, sin UI
│   ├── models/models.ts        # Interfaces de dominio (traducidas del Android original)
│   ├── services/
│   │   ├── supabase.service.ts   # Cliente Supabase + consultas a tablas
│   │   ├── auth.service.ts       # Registro, login, Google, logout, estado de sesión
│   │   └── notification.service.ts
│   ├── storage/                  # Adaptador de storage para Supabase (web / nativo)
│   └── guards/                   # authGuard, guestGuard
├── shared/                    # Reutilizable con UI
│   ├── components/section-placeholder/
│   ├── ui/app-icons.ts          # Registro central de iconos (coherencia)
│   └── utils/                    # Validadores y mapeo de errores
└── features/
    ├── auth/                  # login · register · callback (OAuth web)
    └── shell/                 # tabs + inicio · garaje · mapa · historial · perfil
```

## Buenas prácticas aplicadas

- **Standalone + lazy loading** por componente → arranque más liviano.
- **Un solo cliente Supabase** compartido por inyección de dependencias.
- **Sesión persistida de forma nativa** en móvil (`Preferences`), no solo en memoria.
- **PKCE** como flujo OAuth (recomendado para apps públicas).
- Design tokens de Figma centralizados en `src/theme/variables.scss`; iconos en
  un único registro → coherencia de color e iconografía en todas las vistas.
- Sin vistas duplicadas: navegación definida una sola vez en `app.routes.ts`.
- Contraseñas gestionadas por Supabase Auth (hash + salt); nunca en tablas propias.

## Estado y siguientes pasos

Ver [`AVANCES.md`](AVANCES.md).

## Contribuir

¿Vas a sumarte al desarrollo? Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) —
cómo levantar el proyecto, flujo de ramas y pendientes conocidos.
