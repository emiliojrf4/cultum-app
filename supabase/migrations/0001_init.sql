-- Cultum: esquema mínimo del MVP
-- campanas / personas / ventas

create extension if not exists "pgcrypto";

create table campanas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  entidad_nombre text not null,
  tipo text not null check (tipo in ('donativo_con_obsequio', 'donativo_sin_obsequio', 'rifa_autorizada')),
  precio_papeleta numeric(10,2),
  importe_sugerido numeric(10,2),
  total_papeletas integer,
  autorizacion_junta boolean not null default false,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table personas (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references campanas(id) on delete cascade,
  nombre text not null,
  telefono text not null,
  rol text not null check (rol in ('vendedor', 'donante')),
  rango_inicio integer,
  rango_fin integer,
  enlace_token text not null unique default encode(gen_random_bytes(9), 'base64'),
  created_at timestamptz not null default now()
);

create table ventas (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references campanas(id) on delete cascade,
  persona_id uuid references personas(id) on delete set null,
  numero_papeleta integer,
  comprador_nombre text,
  comprador_telefono text,
  importe numeric(10,2) not null,
  metodo_pago text not null check (metodo_pago in ('bizum', 'efectivo')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'liquidado')),
  stripe_payment_id text,
  created_at timestamptz not null default now()
);

create index ventas_campana_id_idx on ventas(campana_id);
create index ventas_persona_id_idx on ventas(persona_id);
create index personas_campana_id_idx on personas(campana_id);
create index personas_enlace_token_idx on personas(enlace_token);
