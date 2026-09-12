# Backend (Supabase)

Este proyecto usa **Supabase** como unico backend (Auth + Postgres + Storage).
Aqui NO hay codigo de servidor propio: solo la configuracion del proyecto y el
lugar donde viviran las migraciones SQL.

> Estado actual: migracion inicial en
> `migrations/20260911000000_esquema_inicial.sql` con las 9 tablas, RLS y el
> trigger de perfil, **ya aplicada** al proyecto en la nube (verificado con
> `npx supabase migration list`). El frontend ya esta preparado para
> consumirla.

## Estructura

| Ruta | Para que sirve |
|---|---|
| `config.toml` | Configuracion de la CLI de Supabase (puertos, Auth, redirects, Google OAuth). |
| `migrations/` | Migraciones SQL versionadas. Una por archivo, con prefijo de timestamp. |
| `functions/` | Edge Functions (Deno), si mas adelante se necesitan. |
| `seed.sql` | Datos de prueba para el entorno local. |

## Puesta en marcha

La CLI ya está instalada como `devDependency` del proyecto (`npm install
supabase --save-dev`), no hace falta instalarla global. Se usa con `npx
supabase ...` o con los scripts de `package.json`:

```bash
# 1. Login. `npm run db:login` abre el navegador, pero eso requiere una
#    terminal interactiva (TTY) — si estas en un entorno sin eso (p.ej.
#    Claude Code), usa un access token en su lugar:
#    genera uno en supabase.com/dashboard/account/tokens y corre:
npx supabase login --token TU_TOKEN --no-browser

# 2. Enlazar con el proyecto en la nube (pide la contraseña de la BD si no
#    se pasa por flag; resetearla en Project Settings > Database si hace falta)
npx supabase link --project-ref erttcudseqjrpyathmal --password TU_PASSWORD

# 3. Aplicar las migraciones pendientes de migrations/
npm run db:push

# 4. Crear una migracion nueva
npx supabase migration new nombre_de_la_migracion

# 5. (Opcional, requiere Docker Desktop) entorno local con Postgres/Auth/Storage
npm run db:start   # levanta los contenedores
npm run db:diff    # compara el esquema local contra las migraciones
npm run db:stop    # los apaga
```

> `db:push`/`db:link`/`db:login` hablan directo con el proyecto en la nube y
> **no necesitan Docker**. Docker solo hace falta para `db:start` (replica
> local de Supabase) — ver el porque en la seccion de abajo.

## Autenticacion — configuracion en el panel

En **Dashboard > Authentication**:

1. **URL Configuration > Redirect URLs**: agregar
   - `http://localhost:8100/auth/callback` (web dev)
   - la URL de produccion `/auth/callback`
   - `com.rodapp.hibrido://auth/callback` (deep link movil)
2. **Providers > Google**: habilitar y pegar el *Client ID* y *Client Secret*
   de Google Cloud Console. En Google, el "Authorized redirect URI" debe ser
   `https://erttcudseqjrpyathmal.supabase.co/auth/v1/callback`.
3. **Email**: `enable_confirmations` esta en `false` para agilizar pruebas;
   activarlo en produccion.

## Esquema (`20260911000000_esquema_inicial.sql`)

El cliente (`src/app/core/services/supabase.service.ts`) ya referencia estas
tablas. Todas tienen **RLS activado**, con politicas que limitan cada fila a
su `user_id` / `auth.uid()` (para `soat`, `rtm`, `documentos` y los registros
de operacion, la propiedad se resuelve via `es_dueno_de_moto(moto_id)`, que
comprueba que la moto sea del usuario autenticado):

| Tabla | Uso desde el frontend |
|---|---|
| `users` | Perfil de negocio (1:1 con `auth.users.id`): `name`, `lastname`, `correo`, `avatar_url`, `rol`. |
| `motos` | Motocicletas del usuario (`user_id`, `marca`, `modelo`, `placa`, `odometro_inicial`, `activa`). |
| `soat` | Polizas SOAT por moto (`moto_id`, fechas de vigencia). |
| `rtm` | Revision tecnico-mecanica por moto. |
| `documentos` | Otros documentos legales por moto. |
| `registros_combustible` | Tanqueadas (`moto_id`, `costo`, `kilometraje`, ubicacion). |
| `registros_mantenimiento` | Mantenimientos (`moto_id`, `tipo`, `fecha`, `kilometraje`). |
| `notificaciones` | Alertas del usuario (vencimientos, recordatorios) — hoy consumidas como datos de ejemplo en `/app/notificaciones`. |
| `consejos` | Contenido tipo blog, lectura publica para autenticados, escritura solo `rol = 'admin'` — hoy datos de ejemplo en `/app/consejos`. |

Trigger `on_auth_user_created` (`handle_new_user()`) crea automaticamente la
fila en `users` al registrarse. Es un respaldo: `AuthService` tambien la crea
desde el cliente (`upsertPerfil`) tras el registro o el primer login con
Google, por lo que el trigger usa `on conflict (id) do nothing`.

Para aplicarla ver "Puesta en marcha" arriba (`npm run db:link` + `npm run
db:push`). Pendiente despues: conectar a estas tablas los 4 formularios que
hoy solo validan y navegan (combustible, mantenimiento, SOAT, RTM) y las
vistas con estado "con datos" (Inicio, Garaje, Historial).

## Docker (opcional, solo para desarrollo local)

Docker empaqueta un programa junto con todo lo que necesita para correr
(sistema de archivos, librerias, configuracion) en un **contenedor**: una
unidad aislada y reproducible que corre igual en cualquier maquina, sin
"en mi PC funciona" y sin instalar Postgres/Auth/Storage a mano. Es mas
liviano que una maquina virtual completa porque comparte el kernel del
sistema operativo en vez de emular hardware.

La CLI de Supabase usa Docker para `supabase start`: levanta contenedores
con **Postgres + Auth (GoTrue) + Storage + Studio**, una copia local del
proyecto de la nube. Sirve para:

- Probar esta migracion (o una nueva) contra una base de datos real antes
  de aplicarla al proyecto en produccion.
- Desarrollar sin conexion y sin arriesgar los datos reales.
- Ejecutar `supabase db diff` para generar el SQL de una migracion nueva
  automaticamente, comparando el estado local contra las migraciones ya
  aplicadas.

**No es obligatorio**: `db:push`, `db:link` y `db:login` hablan directo con
el proyecto en la nube (`erttcudseqjrpyathmal`) via su API, asi que se puede
seguir trabajando sin Docker. Instalar Docker Desktop (Windows, con backend
WSL2) solo vale la pena si el equipo quiere ese ciclo de prueba local antes
de tocar produccion.
