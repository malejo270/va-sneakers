-- VASNEAKER TENIS — 0003: Supabase Storage
-- Buckets públicos de lectura; escritura exclusiva de administradores.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('brand-logos', 'brand-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vasneaker_admin_select" on storage.objects;
create policy "vasneaker_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id in ('product-images', 'brand-logos') and (select public.is_admin()));

drop policy if exists "vasneaker_admin_insert" on storage.objects;
create policy "vasneaker_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images', 'brand-logos') and (select public.is_admin()));

drop policy if exists "vasneaker_admin_update" on storage.objects;
create policy "vasneaker_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images', 'brand-logos') and (select public.is_admin()))
  with check (bucket_id in ('product-images', 'brand-logos') and (select public.is_admin()));

drop policy if exists "vasneaker_admin_delete" on storage.objects;
create policy "vasneaker_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images', 'brand-logos') and (select public.is_admin()));
