# Backend (Supabase)

Este proyecto usa **Supabase** como unico backend (Auth + Postgres + Storage).
Aqui NO hay codigo de servidor propio: solo la configuracion del proyecto y el
lugar donde viviran las migraciones SQL.

> Estado actual: **sin contenido**. El esquema se definira en una etapa
> posterior. El frontend ya está preparado para consumirlo.

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

## Esquema esperado por el frontend

El cliente (`src/app/core/services/supabase.service.ts`) ya referencia estas
tablas. Las migraciones deberan crearlas **con RLS activado** y politicas que
limiten cada fila a su `user_id` / `auth.uid()`:

| Tabla | Uso desde el frontend |
|---|---|
| `users` | Perfil de negocio (1:1 con `auth.users.id`): `name`, `lastname`, `correo`, `avatar_url`, `rol`. |
| `motos` | Motocicletas del usuario (`user_id`, `marca`, `modelo`, `placa`, `odometro_inicial`, `activa`). |
| `soat` | Polizas SOAT por moto (`moto_id`, fechas de vigencia). |
| `rtm` | Revision tecnico-mecanica por moto. |
| `documentos` | Otros documentos legales por moto. |
| `registros_combustible` | Tanqueadas (`moto_id`, `costo`, `kilometraje`, ubicacion). |
| `registros_mantenimiento` | Mantenimientos (`moto_id`, `tipo`, `fecha`, `kilometraje`). |

> Recomendado: un trigger `on auth.users insert` que cree automaticamente la
> fila en `users`. Mientras no exista, `AuthService` la crea desde el cliente
> (`upsertPerfil`) tras el registro o el primer login con Google.
