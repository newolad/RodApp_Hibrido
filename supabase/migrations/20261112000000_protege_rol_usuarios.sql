-- Protege la columna `users.rol` contra escalada de privilegios.
--
-- Problema: la politica "users: update propio" (auth.uid() = id) permite que
-- cualquier usuario autenticado, con SU PROPIO JWT y la anon key publica, haga
--   update users set rol = 'admin' where id = auth.uid();
-- y con eso obtenga escritura en `consejos` (politica "escritura solo admin").
-- Lo mismo al insertar su fila de perfil con rol = 'admin'.
--
-- Solucion: un trigger que, cuando la peticion llega con un JWT de usuario
-- final (rol de Postgres `authenticated` o `anon`), fuerza `rol = 'user'` al
-- insertar y conserva el valor anterior al actualizar. Los administradores
-- se siguen asignando desde el SQL Editor o con la service_role (sin JWT de
-- usuario), donde el trigger no interviene.

create or replace function public.proteger_rol_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if jwt_role in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.rol := 'user';
    else
      new.rol := old.rol;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_rol_usuario on public.users;

create trigger proteger_rol_usuario
  before insert or update on public.users
  for each row execute function public.proteger_rol_usuario();
