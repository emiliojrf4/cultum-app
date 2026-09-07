-- El token de enlace usaba base64 estándar, que puede contener '/' y '+' y
-- rompe la URL (/p/[token]). Lo pasamos a un alfabeto seguro para URLs y
-- reparamos los tokens ya generados que tuvieran esos caracteres.

alter table personas alter column enlace_token
  set default translate(encode(gen_random_bytes(9), 'base64'), '+/', '-_');

update personas
  set enlace_token = translate(encode(gen_random_bytes(9), 'base64'), '+/', '-_')
  where enlace_token like '%/%' or enlace_token like '%+%';
