-- Libera papeletas reservadas si la creación de la sesión de pago falla
-- (evita perder números para siempre por un error de Stripe).
create or replace function cancelar_venta(p_venta_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  delete from ventas where id = any(p_venta_ids) and estado = 'pendiente';
$$;

grant execute on function cancelar_venta(uuid[]) to anon, authenticated;
