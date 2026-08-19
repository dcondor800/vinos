-- Esquema base. Multi-tenant: todo cuelga de evento_id.

create extension if not exists "pgcrypto";

create type tipo_vino as enum ('tinto','blanco','rosado','espumante','dulce','otro');
create type estado_pedido as enum ('abierto','parcial','completado','vencido');

-- ---------------------------------------------------------------- eventos

create table eventos (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  nombre          text not null,
  cliente         text,
  sede            text,
  fecha_inicio    date not null,
  fecha_fin       date not null,
  logo_url        text,
  color_primario  text default '#B03A48',
  moneda          text default 'PEN',
  activo          boolean default true,
  created_at      timestamptz default now()
);

-- ------------------------------------------------------- expositores/stands

create table expositores (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos(id) on delete cascade,
  nombre      text not null,
  pais        text,
  descripcion text,
  logo_url    text
);

create table stands (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references eventos(id) on delete cascade,
  expositor_id  uuid not null references expositores(id) on delete cascade,
  codigo        text not null,
  zona          text,
  pos_x         numeric,
  pos_y         numeric,
  unique (evento_id, codigo)
);

-- --------------------------------------------------------------- productos

create table productos (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references eventos(id) on delete cascade,
  expositor_id  uuid not null references expositores(id) on delete cascade,
  stand_id      uuid not null references stands(id) on delete cascade,

  nombre        text not null,
  tipo          tipo_vino not null,
  varietal      text,
  pais          text,
  region        text,
  anada         int,
  grado_alcohol numeric(4,2),
  precio        numeric(10,2) not null,

  -- perfil sensorial, escala 1 a 5
  cuerpo        smallint check (cuerpo between 1 and 5),
  dulzor        smallint check (dulzor between 1 and 5),
  acidez        smallint check (acidez between 1 and 5),
  taninos       smallint check (taninos between 1 and 5),

  notas         text[] default '{}',
  maridajes     text[] default '{}',
  descripcion   text,
  imagen_url    text,

  disponible    boolean default true,
  destacado     boolean default false,
  created_at    timestamptz default now()
);

create index on productos (evento_id, disponible);
create index on productos (evento_id, tipo);

-- ------------------------------------------------------- sesión anónima

create table sesiones (
  id               uuid primary key default gen_random_uuid(),
  evento_id        uuid not null references eventos(id) on delete cascade,
  edad_confirmada  boolean default false,
  user_agent       text,
  created_at       timestamptz default now()
);

create table perfiles (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos(id) on delete cascade,
  sesion_id   uuid not null references sesiones(id) on delete cascade,
  respuestas  jsonb not null,
  created_at  timestamptz default now()
);

-- ----------------------------------------------------------------- pedidos

create table pedidos (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos(id) on delete cascade,
  sesion_id   uuid not null references sesiones(id) on delete cascade,
  codigo      text not null,
  estado      estado_pedido default 'abierto',
  created_at  timestamptz default now(),
  unique (evento_id, codigo)
);

create table pedido_items (
  id           uuid primary key default gen_random_uuid(),
  pedido_id    uuid not null references pedidos(id) on delete cascade,
  producto_id  uuid not null references productos(id),
  stand_id     uuid not null references stands(id),
  cantidad     smallint not null default 1 check (cantidad > 0),
  precio_unit  numeric(10,2) not null,
  recogido     boolean default false
);

create index on pedido_items (pedido_id);

-- ------------------------------------------------- telemetría de recomendación
-- El activo más valioso del sistema: qué buscó la gente vs. qué había en el evento.

create table interacciones (
  id           uuid primary key default gen_random_uuid(),
  evento_id    uuid not null references eventos(id) on delete cascade,
  sesion_id    uuid not null references sesiones(id) on delete cascade,
  producto_id  uuid references productos(id) on delete set null,
  accion       text not null,   -- 'sugerido' | 'abierto' | 'agregado' | 'removido'
  posicion     smallint,
  score        numeric(5,2),
  created_at   timestamptz default now()
);

create index on interacciones (evento_id, accion);

-- --------------------------------------------------------------------- RLS

alter table eventos       enable row level security;
alter table expositores   enable row level security;
alter table stands        enable row level security;
alter table productos     enable row level security;
alter table sesiones      enable row level security;
alter table perfiles      enable row level security;
alter table pedidos       enable row level security;
alter table pedido_items  enable row level security;
alter table interacciones enable row level security;

-- Catálogo: lectura pública solo de eventos activos.
create policy lectura_eventos on eventos
  for select using (activo = true);

create policy lectura_expositores on expositores
  for select using (exists (select 1 from eventos e where e.id = evento_id and e.activo));

create policy lectura_stands on stands
  for select using (exists (select 1 from eventos e where e.id = evento_id and e.activo));

create policy lectura_productos on productos
  for select using (exists (select 1 from eventos e where e.id = evento_id and e.activo));

-- Sesión anónima: puede insertar lo suyo. La lectura cruzada se bloquea;
-- el cliente guarda sus propios ids en localStorage y no necesita listar.
create policy insertar_sesion on sesiones for insert with check (true);
create policy insertar_perfil on perfiles for insert with check (true);
create policy insertar_pedido on pedidos for insert with check (true);
create policy insertar_item   on pedido_items for insert with check (true);
create policy insertar_inter  on interacciones for insert with check (true);

-- La escritura del catálogo y la lectura de pedidos van por service_role
-- desde el servidor. Nunca expongas la service key al cliente.
