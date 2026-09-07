-- Ventas registradas por el propio costalero: la numeración sale de SU rango
-- asignado (no del contador global de la campaña), y valida que no se pase
-- de su cupo.
create or replace function crear_venta_persona(
  p_persona_id uuid,
  p_cantidad int,
  p_comprador_nombre text,
  p_comprador_telefono text,
  p_metodo_pago text
) returns setof ventas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona personas%rowtype;
  v_campana campanas%rowtype;
  v_ocupadas int;
  v_cupo int;
  v_numero int;
  v_venta ventas%rowtype;
  i int;
begin
  if p_cantidad is null or p_cantidad < 1 then
    raise exception 'Cantidad inválida';
  end if;

  select * into v_persona from personas where id = p_persona_id for update;
  if not found then
    raise exception 'Persona no encontrada';
  end if;
  if v_persona.rango_inicio is null or v_persona.rango_fin is null then
    raise exception 'Esta persona no tiene cupo de papeletas asignado';
  end if;

  select * into v_campana from campanas where id = v_persona.campana_id;
  if not found or not v_campana.activa then
    raise exception 'Campaña no activa';
  end if;
  if v_campana.precio_papeleta is null then
    raise exception 'La campaña no tiene precio configurado';
  end if;

  v_cupo := v_persona.rango_fin - v_persona.rango_inicio + 1;
  select count(*) into v_ocupadas from ventas
    where persona_id = p_persona_id and estado in ('pendiente', 'pagado', 'liquidado');

  if v_ocupadas + p_cantidad > v_cupo then
    raise exception 'No queda cupo suficiente (% disponibles)', (v_cupo - v_ocupadas);
  end if;

  for i in 1..p_cantidad loop
    v_numero := v_persona.rango_inicio + v_ocupadas + i - 1;
    insert into ventas (
      campana_id, persona_id, numero_papeleta,
      comprador_nombre, comprador_telefono, importe, metodo_pago, estado
    )
    values (
      v_persona.campana_id, p_persona_id, v_numero,
      p_comprador_nombre, p_comprador_telefono, v_campana.precio_papeleta, p_metodo_pago, 'pendiente'
    )
    returning * into v_venta;

    return next v_venta;
  end loop;

  return;
end;
$$;

-- El costalero declara que ya ha enviado el Bizum a la entidad por el total
-- en efectivo acumulado; marca esas ventas como liquidadas.
create or replace function liquidar_ventas_persona(p_persona_id uuid)
returns setof ventas
language sql
security definer
set search_path = public
as $$
  update ventas set estado = 'liquidado'
  where persona_id = p_persona_id and metodo_pago = 'efectivo' and estado = 'pendiente'
  returning *;
$$;

grant execute on function crear_venta_persona(uuid, int, text, text, text) to anon, authenticated;
grant execute on function liquidar_ventas_persona(uuid) to anon, authenticated;
