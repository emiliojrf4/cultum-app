-- RLS filtra filas, no columnas: con solo la policy de "campanas activas
-- son públicas", cualquiera podía pedir la columna entidad_token vía la
-- API pública de Supabase y saltarse la privacidad del enlace de la
-- entidad. Restringimos por columna qué puede leer el público.
revoke select on campanas from anon, authenticated;
grant select (
  id, nombre, entidad_nombre, tipo, precio_papeleta, importe_sugerido,
  total_papeletas, descripcion, objetivo, obsequio_nombre, premio_nombre,
  fecha_texto, autorizacion_junta, activa, created_at
) on campanas to anon, authenticated;
