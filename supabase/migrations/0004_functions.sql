-- VASNEAKER TENIS — 0004: funciones de consulta
-- Todas son security invoker: respetan RLS del usuario que consulta.

-- Catálogo con búsqueda, filtros combinables, orden y paginación en una sola consulta.
create or replace function public.catalog_search(
  p_q text default null,
  p_brands text[] default null,
  p_category public.product_category default null,
  p_size text default null,
  p_min integer default null,
  p_max integer default null,
  p_sort text default 'nuevos',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  model text,
  category public.product_category,
  price_cop integer,
  is_new boolean,
  is_featured boolean,
  brand_name text,
  brand_slug text,
  image_path text,
  image_alt text,
  total_stock integer,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with terms as (
    select t from unnest(string_to_array(public.normalize_text(btrim(coalesce(p_q, ''))), ' ')) as t
    where t <> ''
  ),
  base as (
    select
      p.id, p.slug, p.name, p.model, p.category, p.price_cop, p.is_new, p.is_featured,
      coalesce(p.published_at, p.created_at) as sort_date,
      b.name as brand_name, b.slug as brand_slug,
      img.storage_path as image_path, img.alt as image_alt,
      coalesce((select sum(v.stock) from public.product_variants v where v.product_id = p.id), 0)::integer as total_stock
    from public.products p
    join public.brands b on b.id = p.brand_id
    left join lateral (
      select i.storage_path, i.alt from public.product_images i
      where i.product_id = p.id
      order by i.is_primary desc, i.position asc
      limit 1
    ) img on true
    where p.status = 'published'
      and not exists (
        select 1 from terms
        where position(terms.t in (p.search_text || ' ' || public.normalize_text(b.name))) = 0
      )
      and (p_brands is null or cardinality(p_brands) = 0 or b.slug = any (p_brands))
      and (p_category is null or p.category = p_category)
      and (p_size is null or exists (
        select 1 from public.product_variants v
        where v.product_id = p.id and v.size_label = p_size and v.stock > 0
      ))
      and (p_min is null or p.price_cop >= p_min)
      and (p_max is null or p.price_cop <= p_max)
  )
  select
    base.id, base.slug, base.name, base.model, base.category, base.price_cop, base.is_new, base.is_featured,
    base.brand_name, base.brand_slug, base.image_path, base.image_alt, base.total_stock,
    count(*) over () as total_count
  from base
  order by
    case when p_sort = 'precio-asc' then base.price_cop end asc,
    case when p_sort = 'precio-desc' then base.price_cop end desc,
    base.sort_date desc,
    base.id
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.catalog_search(text, text[], public.product_category, text, integer, integer, text, integer, integer) to anon, authenticated;

-- Tallas con existencias en productos publicados (para el filtro de talla).
create or replace function public.catalog_sizes()
returns table (size_label text)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.size_label
  from public.product_variants v
  join public.products p on p.id = v.product_id and p.status = 'published'
  where v.stock > 0
  group by v.size_label
  order by min(v.sort_order), v.size_label;
$$;

grant execute on function public.catalog_sizes() to anon, authenticated;

-- Indicadores del dashboard. Solo administradores.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  threshold integer;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select s.low_stock_threshold into threshold from public.store_settings s where s.id = 1;
  threshold := coalesce(threshold, 2);

  with stock as (
    select p.id, p.status, p.is_new, p.is_featured,
      coalesce(sum(v.stock), 0) as total,
      count(v.id) as variants,
      count(v.id) filter (where v.stock > 0 and v.stock <= threshold) as low_variants
    from public.products p
    left join public.product_variants v on v.product_id = p.id
    where p.status <> 'archived'
    group by p.id
  )
  select jsonb_build_object(
    'published', count(*) filter (where status = 'published'),
    'sold_out', count(*) filter (where total = 0),
    'low_stock', count(*) filter (where low_variants > 0),
    'brands', (select count(*) from public.brands),
    'new', count(*) filter (where is_new),
    'featured', count(*) filter (where is_featured),
    'threshold', threshold
  ) into result
  from stock;

  return result;
end;
$$;

grant execute on function public.admin_dashboard_stats() to authenticated;
