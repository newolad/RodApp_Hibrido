-- Ajustes menores detectados al conectar los formularios de combustible y
-- mantenimiento a Supabase: dos campos que ya existian en el formulario
-- (UI) pero no tenian columna donde guardarse.

alter table public.registros_mantenimiento
  add column costo numeric;

alter table public.registros_combustible
  add column lugar text;
