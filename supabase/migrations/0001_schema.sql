-- VASNEAKER TENIS — 0001: esquema base
-- Tablas: profiles, brands, products, product_variants, product_images, store_settings

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

do $$ begin
  create type public.product_category as enum ('hombre', 'mujer', 'ninos');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_status as enum ('draft', 'published', 'hidden', 'archived');
exception when duplicate_object then null; end $$;

-- Utilidades ----------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Normaliza texto para búsquedas: minúsculas y sin tildes.
-- unaccent con diccionario explícito es determinista, por eso se declara immutable.
create or replace function public.normalize_text(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')));
$$;

-- profiles: permisos administrativos ----------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea un perfil SIN permisos para cada usuario nuevo.
-- El rol nunca se toma de user_metadata (el usuario puede editarlo).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- brands ---------------------------------------------------------------------

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_path text,
  is_featured boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists brands_name_lower_key on public.brands (lower(name));

create or replace trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- products -------------------------------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  model text check (model is null or char_length(model) <= 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 4000),
  category public.product_category not null,
  price_cop integer not null check (price_cop > 0 and price_cop <= 100000000),
  status public.product_status not null default 'draft',
  is_new boolean not null default false,
  is_featured boolean not null default false,
  published_at timestamptz,
  is_demo boolean not null default false,
  search_text text generated always as (
    public.normalize_text(name || ' ' || coalesce(model, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_category_idx on public.products (status, category);
create index if not exists products_status_price_idx on public.products (status, price_cop);
create index if not exists products_status_published_idx on public.products (status, published_at desc);
create index if not exists products_brand_idx on public.products (brand_id);
create index if not exists products_search_trgm_idx on public.products using gin (search_text extensions.gin_trgm_ops);

create or replace trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Fija published_at la primera vez que un producto se publica.
create or replace function public.products_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create or replace trigger products_published_at
  before insert or update of status on public.products
  for each row execute function public.products_set_published_at();

-- product_variants (una fila por talla) --------------------------------------

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size_label text not null check (char_length(btrim(size_label)) between 1 and 12),
  sort_order numeric(6, 2) not null default 0,
  stock integer not null default 0 check (stock >= 0 and stock <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_product_size_key unique (product_id, size_label)
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);
create index if not exists product_variants_size_in_stock_idx on public.product_variants (size_label) where stock > 0;

create or replace trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- product_images -------------------------------------------------------------

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  alt text not null default '' check (char_length(alt) <= 200),
  position integer not null default 0 check (position >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images (product_id, position);
create unique index if not exists product_images_one_primary on public.product_images (product_id) where is_primary;

-- store_settings (fila única) ------------------------------------------------

create table if not exists public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'VASNEAKER TENIS' check (char_length(store_name) between 1 and 60),
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^57[0-9]{10}$'),
  contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  cali_shipping_cop integer not null default 10000 check (cali_shipping_cop >= 0 and cali_shipping_cop <= 1000000),
  national_shipping_message text not null default 'Envíos a todo Colombia. La tarifa depende de la transportadora y del destino; la confirmamos por WhatsApp.'
    check (char_length(national_shipping_message) <= 300),
  instagram_url text check (instagram_url is null or instagram_url ~ '^https://'),
  tiktok_url text check (tiktok_url is null or tiktok_url ~ '^https://'),
  facebook_url text check (facebook_url is null or facebook_url ~ '^https://'),
  footer_text text not null default 'Sneakers urbanos y deportivos con envío desde Cali a toda Colombia.'
    check (char_length(footer_text) <= 300),
  low_stock_threshold integer not null default 2 check (low_stock_threshold between 0 and 1000),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

create or replace trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();
