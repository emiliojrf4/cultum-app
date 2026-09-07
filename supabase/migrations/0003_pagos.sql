-- Permite 'tarjeta' como método de pago (compras online vía Stripe Checkout).
alter table ventas drop constraint ventas_metodo_pago_check;
alter table ventas add constraint ventas_metodo_pago_check
  check (metodo_pago in ('bizum', 'efectivo', 'tarjeta'));

-- Lectura puntual de ventas por id, para la pantalla de confirmación tras el
-- pago (el cliente solo conoce los ids que el propio backend le devolvió).
create or replace function obtener_ventas(p_venta_ids uuid[])
returns setof ventas
language sql
security definer
set search_path = public
as $$
  select * from ventas where id = any(p_venta_ids);
$$;

grant execute on function crear_venta(uuid, uuid, int, text, text, text) to anon, authenticated;
grant execute on function confirmar_venta(uuid[], text) to anon, authenticated;
grant execute on function obtener_ventas(uuid[]) to anon, authenticated;
