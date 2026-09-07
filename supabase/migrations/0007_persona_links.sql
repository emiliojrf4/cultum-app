-- Lectura pública puntual por enlace_token (el token, 12 bytes aleatorios,
-- funciona como credencial de acceso a ese enlace concreto).
create or replace function obtener_persona_por_token(p_token text)
returns setof personas
language sql
security definer
set search_path = public
as $$
  select * from personas where enlace_token = p_token;
$$;

-- Ventas asociadas a una persona (para que el costalero vea su propio avance).
create or replace function ventas_de_persona(p_persona_id uuid)
returns setof ventas
language sql
security definer
set search_path = public
as $$
  select * from ventas where persona_id = p_persona_id;
$$;

grant execute on function obtener_persona_por_token(text) to anon, authenticated;
grant execute on function ventas_de_persona(uuid) to anon, authenticated;
