# VASNEAKER TENIS

Tienda de sneakers para Colombia construida con Next.js, TypeScript y Supabase. Incluye catálogo responsive, filtros, selección de tallas, carrito persistente en el navegador, finalización por WhatsApp y panel administrativo.

## Requisitos

- Node.js 20.9 o superior (recomendado Node 22).
- Proyecto de Supabase.
- Cuenta de Vercel para desplegar.
- Número comercial de WhatsApp en formato internacional colombiano: `57` seguido de 10 dígitos.

## Desarrollo local

1. Descomprime el proyecto y abre la carpeta en VS Code.
2. Instala dependencias con `npm install`.
3. Copia `.env.example` a `.env.local`.
4. Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los valores de Supabase.
5. Ejecuta las migraciones SQL en orden desde `supabase/migrations/` usando Supabase Dashboard > SQL Editor, o utiliza Supabase CLI.
6. En la terminal ejecuta `npm run dev` y abre `http://localhost:3000`.

Sin variables de Supabase, la portada muestra un catálogo local de demostración para revisar el diseño. En ese modo no se guardan cambios administrativos y WhatsApp no puede finalizar pedidos hasta configurar los datos reales.

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. Abre SQL Editor.
3. Ejecuta en orden los archivos `0001_schema.sql`, `0002_rls.sql`, `0003_storage.sql` y `0004_functions.sql`.
4. Opcional: ejecuta `supabase/seed.sql` para cargar productos ficticios como borradores. No se publican automáticamente.
5. En Authentication > Users, crea tu usuario con correo y contraseña.
6. En SQL Editor ejecuta el siguiente comando, reemplazando el correo por el de tu usuario:

```sql
update public.profiles
set is_admin = true
where lower(email) = lower('TU_CORREO_ADMIN@ejemplo.com');
```

7. Confirma que se actualizó una fila. No intentes habilitarte como administrador desde el navegador.
8. En Storage verifica que existan los buckets `product-images` y `brand-logos`, creados por la migración. Las políticas de escritura permiten subir imágenes únicamente a administradores.
9. Copia la URL del proyecto y la clave pública `anon`/publishable desde Project Settings > API a `.env.local`.

**Seguridad:** nunca uses `service_role` en variables `NEXT_PUBLIC_*`, en el navegador ni en GitHub. Las tablas administrativas están protegidas con RLS; no quites esas políticas para solucionar errores.

## Configurar WhatsApp

Entra en `/admin`, inicia sesión y abre Configuración. Introduce el número en formato `573001234567` (sin `+`, espacios ni guiones), guarda y haz una prueba de pedido. WhatsApp abre un borrador de mensaje; el cliente debe enviarlo manualmente y la tienda debe confirmar la disponibilidad.

## Publicar en Vercel

1. Sube el contenido de esta carpeta a un repositorio privado o público de GitHub (no subas `.env.local`).
2. En Vercel selecciona **Add New > Project** e importa el repositorio.
3. En Settings > Environment Variables crea `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los valores de tu proyecto Supabase.
4. Aplica las variables a Production, Preview y Development según necesites.
5. Despliega el proyecto.
6. En Supabase > Authentication > URL Configuration añade el dominio de Vercel a Site URL y Redirect URLs si aplica.
7. Prueba en producción el catálogo, la cuenta de administrador, la creación de un producto, subida de imagen, actualización de stock y pedido por WhatsApp.

Cada vez que cambies variables de entorno en Vercel, debes volver a desplegar.

## Comandos

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm start
```

## Limitaciones de esta primera versión

- El pedido se envía por WhatsApp; no se crea automáticamente una orden pagada ni se descuenta inventario al abrir WhatsApp.
- Los envíos nacionales se cotizan manualmente.
- El carrito persiste en el navegador del cliente. La disponibilidad debe confirmarse con el comercio.
- Los productos de demostración locales solo se muestran cuando faltan las variables de Supabase; no son inventario real.
