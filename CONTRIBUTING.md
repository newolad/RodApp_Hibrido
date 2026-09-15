# Guía para contribuir

Este documento es para el equipo: cómo levantar el proyecto, cómo está
organizado el trabajo y qué falta por hacer.

## 1. Poner el proyecto a andar

```bash
git clone https://github.com/newolad/RodApp_Hibrido.git
cd RodApp_Hibrido
git checkout Oscar        # rama de trabajo actual (main solo tiene el primer commit)
npm install
```

Pide a quien administre el proyecto Supabase (`erttcudseqjrpyathmal`):
- La **URL** y la **anon key** del proyecto, para pegarlas en
  `src/environments/environment.ts` (ver `.env.example` como referencia de
  qué variables existen — Angular no lee `.env` en runtime).
- Si vas a tocar el esquema de base de datos, acceso de colaborador en el
  proyecto de Supabase (Dashboard) o el `access token` para usar la CLI
  (`supabase/README.md` explica el flujo con `npx supabase`).

```bash
npm start   # http://localhost:8100
```

## 2. Flujo de ramas

- `main` — solo el commit inicial del scaffold; no se trabaja ahí todavía.
- `Oscar` — rama activa del proyecto. Haz tus cambios en una rama propia desde
  `Oscar` (ej. `git checkout -b tu-nombre/lo-que-vayas-a-hacer`) y abre un PR
  contra `Oscar`.
- Evita hacer push directo a `Oscar` si son cambios grandes; un PR pequeño es
  más fácil de revisar entre varios.

## 3. Antes de abrir un PR

```bash
npm run build     # ng build — debe compilar sin errores
```

No hay suite de tests todavía (queda pendiente, ver abajo). Si tu cambio toca
Supabase (tablas, RLS), crea una migración nueva en vez de editar el esquema
a mano desde el Dashboard:

```bash
npx supabase migration new nombre_de_tu_cambio
npm run db:push
```

(Ver [`supabase/README.md`](supabase/README.md) para el detalle completo del
flujo de migraciones.)

## 4. Dónde mirar antes de empezar

| Quiero... | Mirar |
|---|---|
| Entender qué hay hecho y qué falta | [`AVANCES.md`](AVANCES.md) |
| Ver el inventario completo de pantallas (~50) y su estado | [`mockups/VISTAS.md`](mockups/VISTAS.md) |
| Entender el esquema de base de datos y RLS | [`supabase/README.md`](supabase/README.md) |
| Ver la estructura de carpetas del código | sección "Estructura del código" en [`README.md`](README.md) |
| Ver los mockups de Figma | enlace en `AVANCES.md` §2.5 |

## 5. Pendientes conocidos (buenos puntos de entrada)

- **Login con Google**: el código ya está listo
  (`AuthService.loginWithGoogle`); falta habilitar el proveedor en el
  Dashboard de Supabase con credenciales de Google Cloud Console — es
  configuración externa, no requiere tocar código (detalle en
  `supabase/README.md`).
- **Vistas con datos reales pendientes**: Inicio (estado "con datos"),
  Historial, `moto-detail` y `documentos/detalle` siguen usando datos de
  ejemplo en vez de leer de Supabase.
- **~33 pantallas del inventario original** (`mockups/VISTAS.md`) todavía no
  se han construido: onboarding, mapa, notificaciones/consejos dinámicos,
  admin de usuarios, etc.
- **Sin tests automatizados**: si agregas un feature grande, considera sumar
  al menos specs básicos.
- **Sin configuración nativa**: falta `npx cap add android` / `ios` y
  declarar el deep link `com.rodapp.hibrido://` (snippets en `README.md`).

## 6. Convenciones del código

- Todo standalone (sin `NgModules`), estado con **signals**.
- Un solo cliente Supabase compartido (`core/services/supabase.service.ts`);
  no instancies otro.
- Iconos centralizados en `shared/ui/app-icons.ts` — no importes iconos de
  Ionicons sueltos en cada página.
- Mensajes de error de Supabase se traducen en `shared/utils/` — si agregas un
  caso nuevo de error, mapéalo ahí en vez de mostrar el mensaje crudo.
