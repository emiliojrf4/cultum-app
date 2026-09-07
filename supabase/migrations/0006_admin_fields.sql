-- Campos que el panel de admin necesita capturar por campaña.
alter table campanas add column objetivo numeric(10,2);
alter table campanas add column obsequio_nombre text;
alter table campanas add column premio_nombre text;
alter table campanas add column fecha_texto text;
