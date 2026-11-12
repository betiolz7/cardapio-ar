-- Schema do Cardápio AR (ver CONTEXT.md, seção 9).
-- Convenções: preço em centavos (int), medidas do prato em centímetros,
-- toda tabela com dono carrega restaurant_id direto (RLS simples).

create type public.restaurant_status as enum ('trial', 'active', 'suspended');
create type public.member_role       as enum ('owner', 'admin', 'staff');
create type public.model_status      as enum ('draft', 'published');
create type public.event_type        as enum ('menu_view', 'item_view', 'open_3d', 'open_ar', 'ar_unsupported');
create type public.device_kind       as enum ('ios', 'android', 'desktop', 'in_app', 'other');

-- Slug: minúsculas, números e hífen ("casa-lume").
create domain public.slug as text
  check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(value) between 2 and 60);

create table public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  slug        public.slug not null unique,
  name        text not null check (length(name) between 1 and 120),
  logo_url    text,
  theme_color text check (theme_color ~ '^#[0-9a-fA-F]{6}$'),
  whatsapp    text check (whatsapp ~ '^[0-9]{10,13}$'),   -- só dígitos, com DDI: 5511999999999
  status      public.restaurant_status not null default 'trial',
  created_at  timestamptz not null default now()
);

create table public.memberships (
  user_id       uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  role          public.member_role not null default 'staff',
  created_at    timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);
create index memberships_restaurant_idx on public.memberships (restaurant_id);

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null check (length(name) between 1 and 60),
  position      int  not null default 0,
  created_at    timestamptz not null default now(),
  unique (id, restaurant_id)   -- alvo da FK composta em items
);
create index categories_restaurant_idx on public.categories (restaurant_id, position);

create table public.items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id   uuid not null,
  slug          public.slug not null,
  name          text not null check (length(name) between 1 and 120),
  description   text not null default '' check (length(description) <= 600),
  price_cents   int  not null check (price_cents >= 0 and price_cents < 10000000),
  serves        smallint check (serves between 1 and 20),
  photo_url     text,
  is_available  boolean not null default true,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  unique (restaurant_id, slug),
  unique (id, restaurant_id),
  -- a categoria precisa ser do mesmo restaurante
  foreign key (category_id, restaurant_id)
    references public.categories (id, restaurant_id) on delete restrict
);
create index items_restaurant_idx on public.items (restaurant_id, position);

-- Modelo 3D versionado. Só um 'published' por prato.
-- dims_cm: {"w":12,"d":12,"h":9} ou {"diameter":35,"h":3}
create table public.item_models (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  item_id       uuid not null,
  version       int  not null default 1 check (version > 0),
  glb_url       text not null,
  usdz_url      text,
  poster_url    text,
  dims_cm       jsonb not null check (
    jsonb_typeof(dims_cm) = 'object'
    and (dims_cm ? 'h')
    and (
      ((dims_cm ? 'diameter') and not (dims_cm ? 'w') and not (dims_cm ? 'd'))
      or ((dims_cm ? 'w') and (dims_cm ? 'd') and not (dims_cm ? 'diameter'))
    )
  ),
  bbox_m        jsonb,          -- preenchido por scripts/check-model.mjs
  size_bytes    int check (size_bytes > 0),
  status        public.model_status not null default 'draft',
  created_at    timestamptz not null default now(),
  unique (item_id, version),
  foreign key (item_id, restaurant_id)
    references public.items (id, restaurant_id) on delete cascade
);
create unique index item_models_one_published
  on public.item_models (item_id) where status = 'published';

create table public.tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  label         text not null check (length(label) between 1 and 40),
  -- vai no QR (?m=token). Fixo: renomear a mesa não invalida a plaquinha impressa.
  token         text not null unique
                default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at    timestamptz not null default now(),
  unique (restaurant_id, label)
);

-- Métricas anônimas (LGPD): sem dado pessoal, session_id aleatório do navegador.
create table public.events (
  id            bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  item_id       uuid references public.items (id) on delete set null,
  table_id      uuid references public.tables (id) on delete set null,
  type          public.event_type not null,
  session_id    text not null check (length(session_id) between 8 and 64),
  device        public.device_kind not null default 'other',
  created_at    timestamptz not null default now()
);
create index events_restaurant_created_idx on public.events (restaurant_id, created_at);
create index events_session_created_idx    on public.events (session_id, created_at);

-- Regra de negócio: todo prato com 3D publicado precisa de foto (fallback).
create function public.enforce_photo_for_published_model()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'item_models' then
    if new.status = 'published'
       and (select i.photo_url from public.items i where i.id = new.item_id) is null then
      raise exception 'O prato precisa de foto antes de publicar o modelo 3D'
        using errcode = 'check_violation';
    end if;
  elsif tg_table_name = 'items' then
    if new.photo_url is null and exists (
      select 1 from public.item_models m
      where m.item_id = new.id and m.status = 'published'
    ) then
      raise exception 'Não é possível remover a foto de um prato com modelo 3D publicado'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger item_models_require_photo
  before insert or update of status on public.item_models
  for each row execute function public.enforce_photo_for_published_model();

create trigger items_keep_photo
  before update of photo_url on public.items
  for each row execute function public.enforce_photo_for_published_model();
