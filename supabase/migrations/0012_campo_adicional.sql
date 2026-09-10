-- Campo genérico y opcional por campaña: el admin define la etiqueta
-- (p.ej. "Curso y clase del alumno", "Talla", "Edad del donante") y, si la
-- rellena, se pide esa información al comprador/colaborador en el momento
-- de la compra. Si se deja vacío, no se pide nada extra.
alter table campanas add column campo_extra_label text;
alter table ventas add column info_adicional text;

grant select (campo_extra_label) on campanas to anon, authenticated;

create or replace function crear_venta(
  p_campana_id uuid,
  p_persona_id uuid,
  p_cantidad int,
  p_comprador_nombre text,
  p_comprador_telefono text,
  p_metodo_pago text,
  p_info_adicional text default null
) returns setof ventas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campana campanas%rowtype;
  v_precio numeric(10,2);
  v_vendidas int;
  v_numero int;
  v_venta ventas%rowtype;
  i int;
begin
  if p_cantidad is null or p_cantidad < 1 then
    raise exception 'Cantidad inválida';
  end if;

  select * into v_campana from campanas where id = p_campana_id for update;
  if not found then
    raise exception 'Campaña no encontrada';
  end if;
  if not v_campana.activa then
    raise exception 'Campaña no activa';
  end if;

  v_precio := coalesce(v_campana.precio_papeleta, v_campana.importe_sugerido);
  if v_precio is null then
    raise exception 'La campaña no tiene precio configurado';
  end if;

  if v_campana.total_papeletas is not null then
    select count(*) into v_vendidas from ventas
      where campana_id = p_campana_id and estado in ('pendiente', 'pagado', 'liquidado');
    if v_vendidas + p_cantidad > v_campana.total_papeletas then
      raise exception 'No quedan papeletas suficientes';
    end if;
  else
    v_vendidas := 0;
  end if;

  for i in 1..p_cantidad loop
    if v_campana.total_papeletas is not null then
      v_numero := v_vendidas + i;
    else
      v_numero := null;
    end if;

    insert into ventas (
      campana_id, persona_id, numero_papeleta,
      comprador_nombre, comprador_telefono, importe, metodo_pago, estado, info_adicional
    )
    values (
      p_campana_id, p_persona_id, v_numero,
      p_comprador_nombre, p_comprador_telefono, v_precio, p_metodo_pago, 'pendiente', p_info_adicional
    )
    returning * into v_venta;

    return next v_venta;
  end loop;

  return;
end;
$$;

create or replace function crear_venta_persona(
  p_persona_id uuid,
  p_cantidad int,
  p_comprador_nombre text,
  p_comprador_telefono text,
  p_metodo_pago text,
  p_info_adicional text default null
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
      comprador_nombre, comprador_telefono, importe, metodo_pago, estado, info_adicional
    )
    values (
      v_persona.campana_id, p_persona_id, v_numero,
      p_comprador_nombre, p_comprador_telefono, v_campana.precio_papeleta, p_metodo_pago, 'pendiente', p_info_adicional
    )
    returning * into v_venta;

    return next v_venta;
  end loop;

  return;
end;
$$;
