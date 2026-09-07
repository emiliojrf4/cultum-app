-- Enlace de solo lectura para que la propia entidad vea su recaudación,
-- sin usar el enlace público de compra (que no debe filtrar esos datos)
-- ni la contraseña de admin.
alter table campanas add column entidad_token text
  default translate(encode(gen_random_bytes(9), 'base64'), '+/', '-_');

update campanas set entidad_token = translate(encode(gen_random_bytes(9), 'base64'), '+/', '-_')
  where entidad_token is null;

alter table campanas alter column entidad_token set not null;
alter table campanas add constraint campanas_entidad_token_key unique (entidad_token);
