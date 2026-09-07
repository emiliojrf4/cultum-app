-- Cultum: bloquear acceso público directo a las tablas y centralizar la
-- creación de ventas en una función atómica (numeración sin colisiones).

alter table campanas enable row level security;
alter table personas enable row level security;
alter table ventas enable row level security;

-- Solo las campañas activas son legibles públicamente (para la página de compra).
-- personas y ventas no tienen policy: quedan cerradas a anon/authenticated;
-- el backend accede con la service role key, que ignora RLS.
create policy "campanas activas son publicas"
  on campanas for select
  using (activa = true);

-- Reserva N papeletas de una campaña y crea las ventas en estado 'pendiente'
-- dentro de una única transacción, evitando números duplicados bajo compras
-- concurrentes.
create or replace function crear_venta(
  p_campana_id uuid,
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
      comprador_nombre, comprador_telefono, importe, metodo_pago, estado
    )
    values (
      p_campana_id, p_persona_id, v_numero,
      p_comprador_nombre, p_comprador_telefono, v_precio, p_metodo_pago, 'pendiente'
    )
    returning * into v_venta;

    return next v_venta;
  end loop;

  return;
end;
$$;

-- Marca como pagadas las ventas indicadas (llamado desde el webhook de Stripe,
-- o de forma temporal por el backend mientras Stripe no está conectado).
create or replace function confirmar_venta(p_venta_ids uuid[], p_stripe_payment_id text default null)
returns setof ventas
language sql
security definer
set search_path = public
as $$
  update ventas
    set estado = 'pagado', stripe_payment_id = coalesce(p_stripe_payment_id, stripe_payment_id)
    where id = any(p_venta_ids) and estado = 'pendiente'
    returning *;
$$;
