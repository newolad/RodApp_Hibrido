-- Panel de administrador: listar usuarios con sus motos y suspender / habilitar.
--
-- Requiere 20261112000000_protege_rol_usuarios.sql (se reemplaza aqui su
-- funcion para proteger tambien las columnas de suspension).
--
-- Seguridad:
--   * El admin NO obtiene politicas de lectura amplias: todo pasa por dos RPC
--     `security definer` que verifican `es_admin()` con el JWT del que llama.
--   * Un usuario suspendido queda bloqueado EN EL SERVIDOR con politicas
--     RESTRICTIVE (se combinan con AND sobre las existentes), aunque su JWT
--     siga siendo valido hasta que expire. Ademas se borran sus sesiones de
--     `auth.sessions`, asi su refresh token deja de servir.

-- ============================================================================
-- 1. Columnas de suspension
-- ============================================================================

alter table public.users
  add column if not exists suspendido boolean not null default false,
  add column if not exists suspendido_en timestamptz,
  add column if not exists suspendido_motivo text;

-- ============================================================================
-- 2. Helpers (security definer -> no recursan sobre la RLS de `users`)
-- ============================================================================

create or replace function public.es_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and rol = 'admin' and not suspendido
  );
$$;

create or replace function public.esta_suspendido()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select suspendido from public.users where id = auth.uid()),
    false
  );
$$;

-- ============================================================================
-- 3. Proteccion de columnas sensibles (rol + suspension)
--    Con JWT de usuario final no se pueden cambiar, salvo dentro de la RPC
--    de admin, que activa `rodapp.admin_bypass` solo para su transaccion.
-- ============================================================================

create or replace function public.proteger_rol_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  bypass boolean := coalesce(current_setting('rodapp.admin_bypass', true), '') = 'on';
begin
  if jwt_role in ('authenticated', 'anon') and not bypass then
    if tg_op = 'INSERT' then
      new.rol := 'user';
      new.suspendido := false;
      new.suspendido_en := null;
      new.suspendido_motivo := null;
    else
      new.rol := old.rol;
      new.suspendido := old.suspendido;
      new.suspendido_en := old.suspendido_en;
      new.suspendido_motivo := old.suspendido_motivo;
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- 4. Bloqueo de usuarios suspendidos (politicas RESTRICTIVE)
--    `users` solo bloquea escritura: el suspendido debe poder leer su fila
--    para que la app le muestre el aviso de "cuenta suspendida".
-- ============================================================================

create policy "suspendidos: sin escritura de perfil" on public.users
  as restrictive for update using (not public.esta_suspendido());

do $$
declare
  t text;
begin
  foreach t in array array[
    'motos', 'soat', 'rtm', 'documentos',
    'registros_combustible', 'registros_mantenimiento',
    'notificaciones', 'consejos'
  ] loop
    execute format(
      'create policy "suspendidos: sin acceso" on public.%I as restrictive for all
         using (not public.esta_suspendido()) with check (not public.esta_suspendido())',
      t
    );
  end loop;
end;
$$;

-- ============================================================================
-- 5. RPC: listado de usuarios con sus motos (solo admin)
-- ============================================================================

create or replace function public.admin_listar_usuarios()
returns table (
  id uuid,
  name text,
  lastname text,
  correo text,
  avatar_url text,
  rol text,
  suspendido boolean,
  suspendido_en timestamptz,
  suspendido_motivo text,
  created_at timestamptz,
  ultimo_acceso timestamptz,
  motos jsonb
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver los usuarios.'
      using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.name,
    u.lastname,
    coalesce(u.correo, au.email)::text,
    u.avatar_url,
    u.rol,
    u.suspendido,
    u.suspendido_en,
    u.suspendido_motivo,
    u.created_at,
    au.last_sign_in_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'marca', m.marca,
            'modelo', m.modelo,
            'placa', m.placa,
            'cilindrada', m.cilindrada,
            'activa', m.activa,
            'created_at', m.created_at
          )
          order by m.created_at
        )
        from public.motos m
        where m.user_id = u.id
      ),
      '[]'::jsonb
    )
  from public.users u
  left join auth.users au on au.id = u.id
  order by u.created_at desc;
end;
$$;

-- ============================================================================
-- 6. RPC: suspender / habilitar (solo admin)
-- ============================================================================

create or replace function public.admin_cambiar_suspension(
  p_user_id uuid,
  p_suspender boolean,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rol_objetivo text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede suspender usuarios.'
      using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No puedes suspender tu propia cuenta.'
      using errcode = '22023';
  end if;

  select rol into rol_objetivo from public.users where id = p_user_id;
  if rol_objetivo is null then
    raise exception 'El usuario no existe.' using errcode = 'P0002';
  end if;
  if rol_objetivo = 'admin' and p_suspender then
    raise exception 'No se puede suspender a otro administrador.'
      using errcode = '22023';
  end if;

  -- Permite al trigger de proteccion aceptar este cambio (solo esta transaccion).
  perform set_config('rodapp.admin_bypass', 'on', true);

  update public.users
     set suspendido = p_suspender,
         suspendido_en = case when p_suspender then now() else null end,
         suspendido_motivo = case when p_suspender then nullif(trim(p_motivo), '') else null end
   where id = p_user_id;

  perform set_config('rodapp.admin_bypass', 'off', true);

  -- Cierra sus sesiones: el refresh token deja de valer y, como mucho al
  -- expirar el JWT actual (1 h), la app lo saca. Mientras tanto la RLS
  -- restrictiva ya le niega los datos.
  if p_suspender then
    delete from auth.sessions where user_id = p_user_id;
  end if;
end;
$$;

-- Solo usuarios autenticados pueden invocar las RPC (la funcion valida el rol).
revoke all on function public.admin_listar_usuarios() from public, anon;
revoke all on function public.admin_cambiar_suspension(uuid, boolean, text) from public, anon;
grant execute on function public.admin_listar_usuarios() to authenticated;
grant execute on function public.admin_cambiar_suspension(uuid, boolean, text) to authenticated;
