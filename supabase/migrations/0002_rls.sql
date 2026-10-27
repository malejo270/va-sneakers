-- VASNEAKER TENIS — 0002: Row Level Security
-- Visitantes: solo lectura de lo publicado. Administradores: gestión completa.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.store_settings enable row level security;

-- profiles: cada usuario ve su fila; el admin ve todas.
-- No hay políticas de INSERT/UPDATE/DELETE: nadie puede autoasignarse permisos.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- brands
drop policy if exists brands_select_public on public.brands;
create policy brands_select_public on public.brands
  for select to anon, authenticated
  using (true);

drop policy if exists brands_admin_insert on public.brands;
create policy brands_admin_insert on public.brands
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists brands_admin_update on public.brands;
create policy brands_admin_update on public.brands
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists brands_admin_delete on public.brands;
create policy brands_admin_delete on public.brands
  for delete to authenticated using ((select public.is_admin()));

-- products
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));

drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products
  for delete to authenticated using ((select public.is_admin()));

-- product_variants: visibles si el producto padre está publicado.
drop policy if exists variants_select on public.product_variants;
create policy variants_select on public.product_variants
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.status = 'published'
    )
  );

drop policy if exists variants_admin_insert on public.product_variants;
create policy variants_admin_insert on public.product_variants
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists variants_admin_update on public.product_variants;
create policy variants_admin_update on public.product_variants
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists variants_admin_delete on public.product_variants;
create policy variants_admin_delete on public.product_variants
  for delete to authenticated using ((select public.is_admin()));

-- product_images
drop policy if exists images_select on public.product_images;
create policy images_select on public.product_images
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.status = 'published'
    )
  );

drop policy if exists images_admin_insert on public.product_images;
create policy images_admin_insert on public.product_images
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists images_admin_update on public.product_images;
create policy images_admin_update on public.product_images
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists images_admin_delete on public.product_images;
create policy images_admin_delete on public.product_images
  for delete to authenticated using ((select public.is_admin()));

-- store_settings: lectura pública (solo contiene datos de contacto públicos), edición admin.
drop policy if exists settings_select on public.store_settings;
create policy settings_select on public.store_settings
  for select to anon, authenticated using (true);

drop policy if exists settings_admin_update on public.store_settings;
create policy settings_admin_update on public.store_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Privilegios SQL explícitos. RLS sigue siendo la barrera que decide qué filas
-- puede leer o modificar cada usuario.
grant select on public.brands, public.products, public.product_variants, public.product_images, public.store_settings to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert, update, delete on public.brands, public.products, public.product_variants, public.product_images to authenticated;
grant update on public.store_settings to authenticated;
