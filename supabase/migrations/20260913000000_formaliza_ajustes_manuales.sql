-- Formaliza dos ajustes que se hicieron a mano desde el panel de Supabase
-- (Table Editor) y que no estaban en el historial de migraciones: una placa
-- unica por moto y la columna `updated_at`. Idempotente para no fallar si
-- ya existen en el proyecto donde se detectaron.

alter table public.motos
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'motos_placa_key'
  ) then
    alter table public.motos add constraint motos_placa_key unique (placa);
  end if;
end $$;
