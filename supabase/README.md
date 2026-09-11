# Backend (Supabase)

Este proyecto usa **Supabase** como unico backend (Auth + Postgres + Storage).
Aqui NO hay codigo de servidor propio: solo la configuracion del proyecto y el
lugar donde viviran las migraciones SQL.

> Estado actual: migracion inicial creada en
> `migrations/20260911000000_esquema_inicial.sql` con las 9 tablas, RLS y el
> trigger de perfil. **Falta aplicarla** al proyecto en la nube (`supabase db
> push`, ver abajo) — el frontend ya esta preparado para consumirla.

## Estructura

| Ruta | Para que sirve |
|---|---|
| `config.toml` | Configuracion de la CLI de Supabase (puertos, Auth, redirects, Google OAuth). |
| `migrations/` | Migraciones SQL versionadas. Una por archivo, con prefijo de timestamp. |
| `functions/` | Edge Functions (Deno), si mas adelante se necesitan. |
| `seed.sql` | Datos de prueba para el entorno local. |

## Puesta en marcha

```bash
# 1. Instalar la CLI (una vez)
npm install -g supabase

# 2. Enlazar con el proyecto en la nube (usa el Reference ID real)
supabase login
supabase link --project-ref erttcudseqjrpyathmal

# 3. (Opcional) Entorno local con Docker
supabase start

# 4. Crear y aplicar migraciones
supabase migration new crear_esquema_inicial
supabase db push
```

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

### Aplicar la migracion

```bash
supabase link --project-ref erttcudseqjrpyathmal
supabase db push
```

Pendiente tras aplicarla: conectar a estas tablas los 4 formularios que hoy
solo validan y navegan (combustible, mantenimiento, SOAT, RTM) y las vistas
con estado "con datos" (Inicio, Garaje, Historial).
