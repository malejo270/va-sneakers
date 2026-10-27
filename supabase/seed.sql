-- Datos de demostración opcionales. Ejecutar después de las migraciones.
-- Los productos quedan como borrador y no aparecen en la tienda hasta publicarlos.
insert into public.brands (name, slug, is_featured, is_demo)
values ('VASNEAKER Studio', 'vasneaker-studio', true, true)
on conflict (slug) do nothing;

insert into public.products (brand_id, name, model, slug, description, category, price_cop, status, is_new, is_featured, is_demo)
select b.id, v.name, v.model, v.slug, v.description, v.category::public.product_category, v.price_cop, 'draft'::public.product_status, v.is_new, v.is_featured, true
from public.brands b
cross join (values
 ('Court Hueso', 'Essential Low', 'demo-court-hueso', 'Silueta minimalista y versátil para combinar todos los días. Producto de demostración: reemplaza por tu inventario real.', 'hombre', 189900, true, true),
 ('Runner Carbon', 'Motion Series', 'demo-runner-carbon', 'Inspiración deportiva para el ritmo diario. Producto de demostración: reemplaza por tu inventario real.', 'hombre', 229900, true, false),
 ('Court Hueso Mujer', 'Essential Low', 'demo-court-mujer', 'Un básico de líneas depuradas. Producto de demostración: reemplaza por tu inventario real.', 'mujer', 179900, false, true),
 ('Mini Court', 'Junior', 'demo-mini-court', 'Una silueta sencilla para los más pequeños. Producto de demostración: reemplaza por tu inventario real.', 'ninos', 139900, true, false)
) as v(name, model, slug, description, category, price_cop, is_new, is_featured)
where b.slug = 'vasneaker-studio'
on conflict (slug) do nothing;

insert into public.product_variants (product_id, size_label, sort_order, stock)
select p.id, v.size_label, v.sort_order, v.stock
from public.products p
join (values
 ('demo-court-hueso','38',38,2), ('demo-court-hueso','39',39,3), ('demo-court-hueso','40',40,4), ('demo-court-hueso','41',41,3),
 ('demo-runner-carbon','39',39,2), ('demo-runner-carbon','40',40,2), ('demo-runner-carbon','41',41,3), ('demo-runner-carbon','42',42,2),
 ('demo-court-mujer','35',35,1), ('demo-court-mujer','36',36,2), ('demo-court-mujer','37',37,3),
 ('demo-mini-court','30',30,0), ('demo-mini-court','31',31,0)
) as v(slug,size_label,sort_order,stock) on p.slug = v.slug
on conflict (product_id, size_label) do nothing;
