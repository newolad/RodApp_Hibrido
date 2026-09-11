-- Esquema inicial de RodApp.
-- Tablas + RLS que ya espera el frontend (ver `src/app/core/services/supabase.service.ts`
-- y `src/app/core/models/models.ts`), mas `notificaciones` y `consejos` para las
-- vistas que hoy solo tienen datos de ejemplo.

-- ============================================================================
-- 1. Perfil de negocio (1:1 con auth.users)
-- ============================================================================

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  lastname text,
  correo text,
  avatar_url text,
  rol text not null default 'user' check (rol in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: select propio" on public.users
  for select using (auth.uid() = id);

create policy "users: insert propio" on public.users
  for insert with check (auth.uid() = id);

create policy "users: update propio" on public.users
  for update using (auth.uid() = id);

-- Crea la fila de perfil automaticamente al registrarse (respaldo del
-- `upsertPerfil` que ya hace `AuthService` desde el cliente).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, lastname, correo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'apellido',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. Motos
-- ============================================================================

create table public.motos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  marca text not null,
  modelo text not null,
  cilindrada integer,
  placa text not null,
  odometro_inicial numeric not null default 0,
  foto_url text,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create index motos_user_id_idx on public.motos (user_id);

alter table public.motos enable row level security;

create policy "motos: crud propio" on public.motos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Helper: la moto referenciada pertenece al usuario autenticado.
-- ============================================================================

create function public.es_dueno_de_moto(p_moto_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.motos
    where id = p_moto_id and user_id = auth.uid()
  );
$$;

-- ============================================================================
-- 3. Documentos legales (SOAT, RTM, otros)
-- ============================================================================

create table public.soat (
  id uuid primary key default gen_random_uuid(),
  moto_id uuid not null references public.motos (id) on delete cascade,
  numero_poliza text not null,
  aseguradora text not null,
  fecha_inicio date not null,
  fecha_vencimiento date not null,
  created_at timestamptz not null default now()
);

create index soat_moto_id_idx on public.soat (moto_id);
alter table public.soat enable row level security;

create policy "soat: crud por dueno de la moto" on public.soat
  for all using (public.es_dueno_de_moto(moto_id)) with check (public.es_dueno_de_moto(moto_id));

create table public.rtm (
  id uuid primary key default gen_random_uuid(),
  moto_id uuid not null references public.motos (id) on delete cascade,
  numero_certificado text not null,
  nombre_cda text not null,
  fecha_expedicion date not null,
  fecha_vencimiento date not null,
  created_at timestamptz not null default now()
);

create index rtm_moto_id_idx on public.rtm (moto_id);
alter table public.rtm enable row level security;

create policy "rtm: crud por dueno de la moto" on public.rtm
  for all using (public.es_dueno_de_moto(moto_id)) with check (public.es_dueno_de_moto(moto_id));

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  moto_id uuid not null references public.motos (id) on delete cascade,
  tipo text not null,
  nombre text not null,
  entidad_emisora text,
  fecha_vencimiento date,
  recordatorio_activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index documentos_moto_id_idx on public.documentos (moto_id);
alter table public.documentos enable row level security;

create policy "documentos: crud por dueno de la moto" on public.documentos
  for all using (public.es_dueno_de_moto(moto_id)) with check (public.es_dueno_de_moto(moto_id));

-- ============================================================================
-- 4. Registros de operacion (combustible, mantenimiento)
-- ============================================================================

create table public.registros_combustible (
  id uuid primary key default gen_random_uuid(),
  moto_id uuid not null references public.motos (id) on delete cascade,
  tipo_gasolina text not null,
  costo numeric not null,
  kilometraje numeric not null,
  latitud double precision,
  longitud double precision,
  created_at timestamptz not null default now()
);

create index registros_combustible_moto_id_idx on public.registros_combustible (moto_id);
alter table public.registros_combustible enable row level security;

create policy "registros_combustible: crud por dueno de la moto" on public.registros_combustible
  for all using (public.es_dueno_de_moto(moto_id)) with check (public.es_dueno_de_moto(moto_id));

create table public.registros_mantenimiento (
  id uuid primary key default gen_random_uuid(),
  moto_id uuid not null references public.motos (id) on delete cascade,
  tipo text not null,
  fecha date not null,
  kilometraje numeric not null,
  repetir_cada_km numeric,
  notas text,
  created_at timestamptz not null default now()
);

create index registros_mantenimiento_moto_id_idx on public.registros_mantenimiento (moto_id);
alter table public.registros_mantenimiento enable row level security;

create policy "registros_mantenimiento: crud por dueno de la moto" on public.registros_mantenimiento
  for all using (public.es_dueno_de_moto(moto_id)) with check (public.es_dueno_de_moto(moto_id));

-- ============================================================================
-- 5. Notificaciones (alertas de vencimiento, recordatorios)
-- ============================================================================

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  icono text not null,
  color text not null,
  titulo text not null,
  detalle text not null,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create index notificaciones_user_id_idx on public.notificaciones (user_id);
alter table public.notificaciones enable row level security;

create policy "notificaciones: crud propio" on public.notificaciones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- 6. Consejos para moteros (contenido global, solo lectura para usuarios)
-- ============================================================================

create table public.consejos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  titulo text not null,
  resumen text not null,
  contenido text not null,
  lectura text not null,
  created_at timestamptz not null default now()
);

alter table public.consejos enable row level security;

create policy "consejos: lectura para autenticados" on public.consejos
  for select using (auth.role() = 'authenticated');

create policy "consejos: escritura solo admin" on public.consejos
  for all using (
    exists (select 1 from public.users where id = auth.uid() and rol = 'admin')
  ) with check (
    exists (select 1 from public.users where id = auth.uid() and rol = 'admin')
  );
