# RodApp Híbrido — Avances

Documento de continuidad. Resume **todo** lo hecho para poder retomar tras
reiniciar el equipo.

- **Ubicación:** `C:\Users\EQUIPO\Documents\Ucompensar\7mo Semestre\Desarrollo apps hibridas\RodApp_Hibrido`
- **Stack:** Ionic 8 (standalone) + Angular 18 (standalone, sin NgModules) + Capacitor 6 + Supabase (backend único). Estado con signals.
- **Última actualización:** 2026-09-06

---

## 1. Estado de Git (IMPORTANTE al reiniciar)

- Repo inicializado. Rama por defecto renombrada a `main`.
- **Rama de trabajo actual: `Oscar`** — se sigue trabajando aquí.
- `main` y `Oscar` parten del mismo commit inicial `75a0afd`
  *"Primer commit: base del proyecto hibrido RodApp…"*.
- **El `git push` está PENDIENTE** (lo bloquea el clasificador de permisos de
  Claude Code, por ser una acción hacia un repo externo). Falta también añadir
  el remoto.

### Para subir todo (ejecutar manualmente en la terminal)

```bash
cd "C:\Users\EQUIPO\Documents\Ucompensar\7mo Semestre\Desarrollo apps hibridas\RodApp_Hibrido"
git remote add origin https://github.com/newolad/RodApp_Hibrido.git
git push -u origin main
git push -u origin Oscar
```

> Remoto previsto: `https://github.com/newolad/RodApp_Hibrido.git` (coincide con
> la cuenta y con lo que figuraba en el proyecto `rodapp-ionic-core`). Si `main`
> remoto ya tiene historia, evaluar `git push -u origin main --force`
> (según `GEMINI.md` del proyecto anterior, el usuario prefiere force-push).

---

## 2. Lo que está HECHO

### 2.1 Base del proyecto (build verificado)
- Scaffold completo: `package.json`, `angular.json` (salida a `www`), `tsconfig*`
  (con `baseUrl`), `ionic.config.json`, `capacitor.config.ts`, `.gitignore`,
  `.editorconfig`, `.nvmrc` (Node 20), `.browserslistrc`, `.env.example`.
- `npm install` ejecutado (1040 paquetes). `node_modules/` presente pero ignorado.
- **`ng build` (dev y prod) verificados sin errores.** Arranque: `npm start`
  → `http://localhost:8100`.
- Tema global oscuro desde tokens de Figma (`src/theme/variables.scss`) +
  utilidades compartidas (`src/global.scss`). Íconos centralizados
  (`src/app/shared/ui/app-icons.ts`).
- PWA: `manifest.webmanifest`, meta tags, `src/assets/icon/logo.svg`.

### 2.2 Autenticación con Supabase — completa (código)
| Función | Archivo |
|---|---|
| Cliente único, PKCE, storage por plataforma (Preferences nativo / localStorage web), `detectSessionInUrl` solo web | `src/app/core/services/supabase.service.ts` |
| Estado de sesión (signals), `init()`, registro, login, Google (web + nativo), `completeOAuthFromUrl`, `logout`, carga/creación de perfil | `src/app/core/services/auth.service.ts` |
| Adaptador de almacenamiento | `src/app/core/storage/capacitor-storage.adapter.ts` |
| Guards `authGuard` / `guestGuard` | `src/app/core/guards/` |
| Deep link OAuth nativo (`com.rodapp.hibrido://auth/callback`) | `src/app/app.component.ts` |
| `APP_INITIALIZER` resuelve la sesión antes de pintar UI | `src/app/app.config.ts` |
| Toasts/alertas/loading centralizados | `src/app/core/services/notification.service.ts` |
| Validadores + mapeo de errores de Supabase a español | `src/app/shared/utils/` |

### 2.3 Vistas en código (7 de ~40)
| Vista | Ruta | Estado |
|---|---|---|
| Login | `/login` | ✅ completa (form reactivo + Google) |
| Registro | `/registro` | ✅ completa (form reactivo + confirmación de contraseña + Google) |
| Callback OAuth | `/auth/callback` | ✅ (puente web) |
| Shell de 5 tabs | `/app` | ✅ (Inicio·Garaje·Mapa·Historial·Perfil) |
| Inicio | `/app/inicio` | 🟨 saludo real + estado vacío (falta estado "con datos") |
| Garaje | `/app/garaje` | 🟨 placeholder |
| Mapa | `/app/mapa` | 🟨 placeholder |
| Historial | `/app/historial` | 🟨 placeholder |
| Perfil | `/app/perfil` | ✅ tarjeta de identidad + accesos + **cerrar sesión** |

Placeholders comparten `SectionPlaceholderComponent` (coherencia visual).

### 2.4 Backend (carpeta `supabase/`)
- `config.toml` (Auth, redirects web + deep link, provider Google), `migrations/`,
  `functions/`, `seed.sql`, `README.md` con el esquema esperado.
- **Sin SQL todavía**, por diseño.

### 2.5 Figma — mockups
- **Archivo nuevo creado:** `RodApp Híbrido — Mockups`
  → https://www.figma.com/design/qJRAjknoNxqzfxprOmTeJI
- 7 frames fieles al código: Login, Crear cuenta, Inicio, Garaje, Mapa,
  Historial, Perfil (tema oscuro, tipografía Inter, íconos coherentes).
- **Prototipo navegable cableado:** Login↔Registro, Login→Inicio, Registro→Inicio,
  barra de tabs interconectada en las 5 pantallas, Perfil→Login (logout).
  Punto de inicio del flujo en Login.
- Board "Vistas — informe" con las 7 vistas organizadas + título.

### 2.6 Carpeta `mockups/` (en este proyecto)
| Ruta | Contenido |
|---|---|
| `mockups/VISTAS.md` | **Inventario completo** de ~50 vistas en 12 secciones, con estado (✅/🟨/⬜), ruta Ionic propuesta y fuente (archivo Android/web). Reconstruido de `rodApp-santiago` + frontend web + AVANCES; **pendiente validar contra el Figma original**. |
| `mockups/informe/rodapp-vistas-general.png` | Imagen 2216×2534 con las 7 vistas organizadas (para el informe). |
| `mockups/manual/` | **Vacía.** Los 7 PNG por vista quedaron pendientes (ver §3). |

---

## 3. Lo que está PENDIENTE

### Bloqueado / requiere acción del usuario
1. **`git push`** de `main` y `Oscar` → comandos en §1.
2. **7 PNG individuales por vista** para el manual (`mockups/manual/`): se cortó
   por el **límite de llamadas MCP del plan Starter de Figma**. Opciones:
   reintentar cuando se reinicie el límite, exportarlos a mano desde Figma
   (seleccionar frames → panel Export → PNG 2x), o recortarlos del PNG general.
3. **Enlace del Figma original "RodApp" (31 frames)** para completar/validar
   `mockups/VISTAS.md`. No hay forma de encontrarlo sin la URL.

### Backend Supabase (pendiente, se verá "más adelante")
- Migración inicial con **RLS**: `users`, `motos`, `soat`, `rtm`, `documentos`,
  `registros_combustible`, `registros_mantenimiento`.
- Trigger `on auth.users insert` → fila en `users` (hoy lo hace el cliente).
- Tablas nuevas del alcance Figma: `notificaciones`, `consejos`.
- Poner URL + `anon key` reales en `src/environments/environment*.ts`
  (ahora usan las del proyecto Supabase del RodApp original).
- En el panel de Supabase: registrar Redirect URLs y habilitar Google.

### Configuración nativa (cuando se compile a móvil)
- `npx cap add android` / `npx cap add ios`.
- Declarar el esquema `com.rodapp.hibrido://` en `AndroidManifest.xml` e
  `Info.plist` (snippets en `README.md`).

### Vistas por construir (~33)
Ver `mockups/VISTAS.md` para el detalle. Resumen por sección:
Onboarding/acceso (7 faltan) · Inicio con datos + gráficos (2) · Garaje: lista,
registrar/editar/detalle de moto, documentos (5) · Documentos legales: SOAT, RTM,
nuevo, detalle, adicionales, personalizado (6) · Registros: combustible,
mantenimiento, selector, progreso (4) · Historial: con datos + filtros (2) ·
Mapa: búsqueda, ruta, detalle de lugar (3) · Notificaciones (2) · Consejos (2) ·
Perfil: editar, ajustes, seguridad, acerca de (4) · Admin de usuarios (2).

---

## 4. Cómo retomar tras reiniciar

1. Abrir el proyecto en VS Code:
   `code "C:\Users\EQUIPO\Documents\Ucompensar\7mo Semestre\Desarrollo apps hibridas\RodApp_Hibrido"`
2. Verificar rama: `git branch` → debe estar en **`Oscar`**.
3. (Si no se corrió el push) ejecutar los comandos de §1.
4. `npm start` para levantar la app en web.
5. Continuar por: subir a GitHub → esquema de Supabase → construir las vistas
   pendientes siguiendo `mockups/VISTAS.md`.

## 5. Estructura del código

```
src/app/
├── core/            # servicios singleton (supabase, auth, notification), storage, guards, models
├── shared/          # section-placeholder, app-icons, utils (validators, auth-error)
└── features/
    ├── auth/        # login · register · callback
    └── shell/       # tabs + inicio · garaje · mapa · historial · perfil
supabase/            # config del backend (sin esquema)
mockups/             # VISTAS.md + imágenes para informe/manual
```
