'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, ArrowRight, Check, ChevronDown, Heart, Menu, Search, ShoppingBag, SlidersHorizontal, Truck, X } from 'lucide-react'
import { demoProducts, money, type Product } from '@/lib/store'
import { getSupabaseBrowser } from '@/lib/supabase/client'

type CartItem = { key: string; productId: string; slug: string; name: string; brand: string; price: number; image: string; size: string; variantId: string; qty: number; stock: number }
type Settings = { store_name: string; whatsapp_number: string | null; cali_shipping_cop: number; national_shipping_message: string; footer_text: string; instagram_url?: string | null }
const fallbackSettings: Settings = { store_name: 'VASNEAKER TENIS', whatsapp_number: null, cali_shipping_cop: 10000, national_shipping_message: 'Envíos a todo Colombia. La tarifa depende de la transportadora y del destino; la confirmamos por WhatsApp.', footer_text: 'Sneakers urbanos y deportivos con envíos desde Cali a toda Colombia.' }
const imageUrl = (path?: string | null) => {
  if (!path) return '/placeholder.jpg'
  if (path.startsWith('/') || path.startsWith('http')) return path
  const supabase = getSupabaseBrowser()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabase || !url) return '/placeholder.jpg'
  return `${url}/storage/v1/object/public/product-images/${path}`
}

export default function Storefront() {
  const supabase = getSupabaseBrowser()
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<Settings>(fallbackSettings)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('todas')
  const [brand, setBrand] = useState('todas')
  const [size, setSize] = useState('todas')
  const [sort, setSort] = useState('nuevos')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [selectedImage, setSelectedImage] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedQty, setSelectedQty] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [customer, setCustomer] = useState({ name: '', city: '', address: '', notes: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    if (!supabase) {
      setProducts(demoProducts)
      setLoading(false)
      return
    }
    const [pRes, sRes] = await Promise.all([
      supabase.from('products').select('id,slug,name,model,description,category,price_cop,is_new,is_featured,status,brand_id,brands(name,slug),product_variants(id,size_label,stock,sort_order),product_images(id,storage_path,alt,is_primary,position)').eq('status', 'published').order('published_at', { ascending: false }),
      supabase.from('store_settings').select('store_name,whatsapp_number,cali_shipping_cop,national_shipping_message,footer_text,instagram_url').eq('id', 1).maybeSingle(),
    ])
    if (pRes.error) setNotice('No se pudo cargar el catálogo. Verifica las migraciones y las políticas de Supabase.')
    else {
      const mapped = (pRes.data ?? []).map((raw: any) => {
        const imgs = [...(raw.product_images ?? [])].sort((a: any, b: any) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) || a.position - b.position)
        const variants = [...(raw.product_variants ?? [])].sort((a: any, b: any) => Number(a.sort_order) - Number(b.sort_order))
        return { ...raw, brand_name: raw.brands?.name ?? 'Sin marca', brand_slug: raw.brands?.slug, variants, images: imgs, image_path: imgs[0]?.storage_path ?? null, image_alt: imgs[0]?.alt ?? raw.name, total_stock: variants.reduce((sum: number, v: any) => sum + Number(v.stock || 0), 0) } as Product
      })
      setProducts(mapped)
    }
    if (sRes.data) setSettings({ ...fallbackSettings, ...sRes.data })
    setLoading(false)
  }, [supabase])

  useEffect(() => { void loadData() }, [loadData])
  useEffect(() => { try { const saved = localStorage.getItem('vasneaker-cart'); if (saved) setCart(JSON.parse(saved)) } catch { /* ignore invalid local cart */ } }, [])
  useEffect(() => { try { localStorage.setItem('vasneaker-cart', JSON.stringify(cart)) } catch { /* storage may be disabled */ } }, [cart])

  const brands = useMemo(() => Array.from(new Set(products.map(p => p.brand_name))).sort(), [products])
  const sizes = useMemo(() => Array.from(new Set(products.flatMap(p => p.variants.filter(v => v.stock > 0).map(v => v.size_label)))).sort((a, b) => Number(a) - Number(b)), [products])
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es-CO')
    const items = products.filter(p => {
      const matchesQ = !q || `${p.name} ${p.model ?? ''} ${p.brand_name}`.toLocaleLowerCase('es-CO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      return matchesQ && (category === 'todas' || p.category === category) && (brand === 'todas' || p.brand_name === brand) && (size === 'todas' || p.variants.some(v => v.size_label === size && v.stock > 0))
    })
    if (sort === 'precio-asc') items.sort((a, b) => a.price_cop - b.price_cop)
    if (sort === 'precio-desc') items.sort((a, b) => b.price_cop - a.price_cop)
    if (sort === 'nuevos') items.sort((a, b) => Number(b.is_new) - Number(a.is_new))
    return items
  }, [products, search, category, brand, size, sort])
  const featured = products.filter(p => p.is_featured).slice(0, 4)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cityIsCali = customer.city.trim().toLocaleLowerCase('es-CO').includes('cali')
  const shipping = cityIsCali ? settings.cali_shipping_cop : null
  const imageFor = (p: Product) => imageUrl(p.images?.[0]?.storage_path ?? p.image_path)

  const openProduct = (product: Product) => { setSelected(product); setSelectedImage(imageFor(product)); setSelectedSize(''); setSelectedQty(1); setNotice('') }
  const addToCart = () => {
    if (!selected) return
    const variant = selected.variants.find(v => v.size_label === selectedSize)
    if (!variant || variant.stock < 1) { setNotice('Selecciona una talla disponible.'); return }
    if (selectedQty < 1 || selectedQty > variant.stock) { setNotice(`Solo hay ${variant.stock} unidad(es) disponibles en esa talla.`); return }
    const key = `${selected.id}:${variant.id}`
    setCart(current => {
      const existing = current.find(item => item.key === key)
      if (existing) return current.map(item => item.key === key ? { ...item, qty: Math.min(variant.stock, item.qty + selectedQty), stock: variant.stock } : item)
      return [...current, { key, productId: selected.id, slug: selected.slug, name: selected.name, brand: selected.brand_name, price: selected.price_cop, image: imageFor(selected), size: variant.size_label, variantId: variant.id, qty: selectedQty, stock: variant.stock }]
    })
    setSelected(null); setCartOpen(true); setNotice('')
  }
  const changeQty = (key: string, delta: number) => setCart(current => current.map(item => item.key === key ? { ...item, qty: Math.max(1, Math.min(item.stock, item.qty + delta)) } : item))
  const removeItem = (key: string) => setCart(current => current.filter(item => item.key !== key))
  const sendWhatsApp = async () => {
    setNotice('')
    if (!customer.name.trim() || !customer.city.trim() || !customer.address.trim()) { setNotice('Completa tu nombre, ciudad y dirección para continuar.'); return }
    if (!cart.length) { setNotice('Tu carrito está vacío.'); return }
    if (!settings.whatsapp_number) { setNotice('Falta configurar el número de WhatsApp en el panel administrativo.'); return }
    let liveCart = cart
    if (supabase) {
      if (cart.some(item => item.productId.startsWith('demo-'))) { setNotice('Tu bolsa contiene productos de demostración antiguos. Vacíala y agrega productos publicados de la tienda.'); return }
      const productIds = Array.from(new Set(cart.map(item => item.productId)))
      const { data: liveProducts, error: liveError } = await supabase.from('products').select('id,name,price_cop,status,product_variants(id,product_id,size_label,stock)').in('id', productIds).eq('status', 'published')
      if (liveError) { setNotice('No pudimos verificar el inventario. Intenta de nuevo en unos segundos.'); return }
      const byProduct = new Map((liveProducts ?? []).map((p: any) => [p.id, p]))
      const checked = cart.map(item => {
        const p: any = byProduct.get(item.productId)
        const v = p?.product_variants?.find((variant: any) => variant.id === item.variantId)
        return { ...item, name: p?.name ?? item.name, price: Number(p?.price_cop ?? item.price), stock: Number(v?.stock ?? 0), size: v?.size_label ?? item.size, available: Boolean(p && v && Number(v.stock) >= item.qty) }
      })
      if (checked.some(item => !item.available)) { setNotice('El stock cambió o un producto ya no está publicado. Revisa tu bolsa y vuelve a intentarlo.'); return }
      liveCart = checked.map(({ available: _available, ...item }) => item)
      setCart(liveCart)
    } else {
      const checked = cart.map(item => {
        const p = products.find(product => product.id === item.productId)
        const v = p?.variants.find(variant => variant.id === item.variantId)
        return { ...item, price: p?.price_cop ?? item.price, stock: v?.stock ?? item.stock, available: Boolean(p && v && v.stock >= item.qty) }
      })
      if (checked.some(item => !item.available)) { setNotice('Al menos una talla cambió de disponibilidad. Actualiza el carrito antes de continuar.'); return }
      liveCart = checked.map(({ available: _available, ...item }) => item)
    }
    const freshSubtotal = liveCart.reduce((sum, item) => sum + item.price * item.qty, 0)
    const isCali = customer.city.trim().toLocaleLowerCase('es-CO').includes('cali')
    const shippingText = isCali ? money(settings.cali_shipping_cop) : 'Por confirmar'
    const totalText = isCali ? money(freshSubtotal + settings.cali_shipping_cop) : 'Por confirmar'
    const lines = liveCart.map((item, i) => `${i + 1}. ${item.brand} — ${item.name}\n   Talla: ${item.size} | Cantidad: ${item.qty}\n   Precio unitario: ${money(item.price)}\n   Subtotal: ${money(item.price * item.qty)}`).join('\n\n')
    const message = `PEDIDO — VASNEAKER TENIS\n\nCliente: ${customer.name.trim()}\n\nPRODUCTOS\n${lines}\n\nRESUMEN\nSubtotal productos: ${money(freshSubtotal)}\nEnvío: ${shippingText}\nTotal estimado: ${totalText}\n\nENTREGA\nCiudad: ${customer.city.trim()}\nDirección: ${customer.address.trim()}\nIndicaciones: ${customer.notes.trim() || 'Ninguna'}\n\nHola, quiero confirmar la disponibilidad de estos productos y coordinar el envío.`
    window.open(`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    setNotice('WhatsApp se abrirá para que envíes el mensaje. El pedido no queda confirmado hasta que la tienda te responda.')
  }

  return <main className="site-shell">
    <div className="announcement">Envíos desde Cali a toda Colombia · Asesoría personalizada por WhatsApp</div>
    <header className="header">
      <button className="icon-button mobile-menu" aria-label="Ver catálogo" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}><Menu size={20}/></button>
      <a className="brandmark" href="#inicio" aria-label="VASNEAKER TENIS inicio">VASNEAKER<small>T E N I S</small></a>
      <nav className="navlinks" aria-label="Navegación principal"><a href="#catalogo">Catálogo</a><a href="#colecciones">Colecciones</a><a href="#envios">Envíos</a></nav>
      <div className="header-actions"><button className="icon-button" aria-label="Ir al catálogo y buscar" onClick={() => { document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }); setTimeout(() => document.getElementById('product-search')?.focus(), 250) }}><Search size={18}/><span className="action-label">Buscar</span></button><button className="icon-button" onClick={() => setCartOpen(true)} aria-label={`Abrir carrito, ${cartCount} productos`}><ShoppingBag size={19}/><span className="action-label">Bolsa</span><span className="count-pill">{cartCount}</span></button></div>
    </header>

    <section className="hero" id="inicio"><div className="hero-copy"><span className="eyebrow">VASNEAKER · SELECCIÓN URBANA</span><h1 className="serif">Tu estilo.<br/>Tu siguiente<br/><em>paso.</em></h1><p>Siluetas que hablan por ti. Encuentra tus próximos tenis y lleva tu estilo a donde quieras ir.</p><a className="button-dark" href="#catalogo">Explorar colección <ArrowRight size={15}/></a></div><div className="hero-image"><Image src="/editorial/hero.png" alt="Selección editorial de sneakers VASNEAKER TENIS" width={1200} height={1200} priority sizes="(max-width: 680px) 100vw, 52vw"/></div></section>

    <section className="section" id="colecciones"><div className="section-heading"><div><span className="eyebrow">Encuentra tu línea</span><h2 className="serif">Colecciones para cada día</h2></div><a className="text-link" href="#catalogo">Ver catálogo completo <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }}/></a></div><div className="editorial-grid"><a className="editorial-card" href="#catalogo" onClick={() => setCategory('hombre')}><Image src="/editorial/hombre.png" alt="Colección de tenis para hombre" width={800} height={1000} sizes="(max-width: 680px) 100vw, 33vw"/><span className="serif">Hombre <ArrowRight size={17} style={{ display: 'inline', verticalAlign: 'middle' }}/></span></a><a className="editorial-card" href="#catalogo" onClick={() => setCategory('mujer')}><Image src="/editorial/mujer.png" alt="Colección de tenis para mujer" width={800} height={1000} sizes="(max-width: 680px) 100vw, 33vw"/><span className="serif">Mujer <ArrowRight size={17} style={{ display: 'inline', verticalAlign: 'middle' }}/></span></a><a className="editorial-card" href="#catalogo" onClick={() => setCategory('ninos')}><Image src="/editorial/ninos.png" alt="Colección de tenis para niños" width={800} height={1000} sizes="(max-width: 680px) 100vw, 33vw"/><span className="serif">Niños <ArrowRight size={17} style={{ display: 'inline', verticalAlign: 'middle' }}/></span></a></div></section>

    <section className="section catalog-section" id="catalogo"><div className="section-heading"><div><span className="eyebrow">Selección VASNEAKER</span><h2 className="serif">Encuentra tus favoritos</h2></div><span style={{ fontSize: 11, color: 'var(--muted)' }}>{loading ? 'Cargando catálogo…' : `${filtered.length} ${filtered.length === 1 ? 'referencia' : 'referencias'}`}</span></div>
      <div className="catalog-toolbar"><div className="catalog-filters"><input id="product-search" className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tenis, modelo o marca…" aria-label="Buscar productos"/><select className="filter-select" value={category} onChange={e => setCategory(e.target.value)} aria-label="Filtrar por categoría"><option value="todas">Todas las categorías</option><option value="hombre">Hombre</option><option value="mujer">Mujer</option><option value="ninos">Niños</option></select><select className="filter-select" value={brand} onChange={e => setBrand(e.target.value)} aria-label="Filtrar por marca"><option value="todas">Todas las marcas</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}</select><select className="filter-select" value={size} onChange={e => setSize(e.target.value)} aria-label="Filtrar por talla"><option value="todas">Todas las tallas</option>{sizes.map(s => <option key={s} value={s}>{s}</option>)}</select></div><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, whiteSpace: 'nowrap' }}><ArrowDownUp size={14}/><select className="filter-select" style={{ minWidth: 150 }} value={sort} onChange={e => setSort(e.target.value)} aria-label="Ordenar productos"><option value="nuevos">Más recientes</option><option value="precio-asc">Menor precio</option><option value="precio-desc">Mayor precio</option></select></label></div>
      {notice && !cartOpen && !selected && <div className="notice" role="status">{notice}</div>}
      {loading ? <div className="empty-state">Estamos preparando la selección para ti…</div> : filtered.length ? <div className="product-grid">{filtered.map(p => <article className="product-card" key={p.id}><button className="product-photo" onClick={() => openProduct(p)} aria-label={`Ver ${p.name}`} style={{ border: 0, padding: 0, width: '100%', display: 'block' }}><Image src={imageFor(p)} alt={p.image_alt || p.name} width={700} height={800} sizes="(max-width: 680px) 50vw, (max-width: 1000px) 33vw, 25vw"/><span className="product-badge">{p.total_stock === 0 ? 'Agotado' : p.is_new ? 'Nuevo' : p.is_featured ? 'Destacado' : p.category === 'ninos' ? 'Junior' : 'Selección'}</span></button><div className="product-info"><span className="product-brand">{p.brand_name}</span><div className="product-name-row"><button className="product-name" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => openProduct(p)}>{p.name}</button><span className="product-price">{money(p.price_cop)}</span></div><div className="product-meta"><span>{p.variants.filter(v => v.stock > 0).length ? `${p.variants.filter(v => v.stock > 0).length} tallas disponibles` : 'Sin existencias'}</span><button className="quick-add" onClick={() => openProduct(p)} disabled={!p.variants.some(v => v.stock > 0)}>{p.variants.some(v => v.stock > 0) ? 'Elegir talla +' : 'Agotado'}</button></div></div></article>)}</div> : <div className="empty-state"><Search size={25} style={{ margin: '0 auto 14px' }}/><strong>No encontramos resultados</strong><p style={{ fontSize: 12 }}>Prueba con otra búsqueda o cambia los filtros.</p><button className="button-outline" onClick={() => { setSearch(''); setCategory('todas'); setBrand('todas'); setSize('todas') }}>Limpiar filtros</button></div>}
    </section>

    {featured.length > 0 && <section className="section" style={{ paddingTop: 0 }}><div className="section-heading"><div><span className="eyebrow">Elegidos para ti</span><h2 className="serif">Destacados</h2></div></div><div className="product-grid">{featured.map(p => <article className="product-card" key={`featured-${p.id}`}><button className="product-photo" onClick={() => openProduct(p)} style={{ border: 0, padding: 0, width: '100%', display: 'block' }}><Image src={imageFor(p)} alt={p.name} width={700} height={800} sizes="(max-width: 680px) 50vw, 25vw"/><span className="product-badge">Selección</span></button><div className="product-info"><span className="product-brand">{p.brand_name}</span><div className="product-name-row"><span className="product-name">{p.name}</span><span className="product-price">{money(p.price_cop)}</span></div><div className="product-meta"><span>{p.variants.some(v => v.stock > 0) ? 'Disponible' : 'Agotado'}</span><button className="quick-add" onClick={() => openProduct(p)} disabled={!p.variants.some(v => v.stock > 0)}>Ver producto +</button></div></div></article>)}</div></section>}

    <section className="benefits" id="envios"><div className="benefit"><Truck size={20} strokeWidth={1.4}/><div><strong>Envíos en Cali · $10.000</strong><p>Entrega coordinada para tu comodidad.</p></div></div><div className="benefit"><ArrowRight size={20} strokeWidth={1.4}/><div><strong>Envíos nacionales</strong><p>{settings.national_shipping_message}</p></div></div><div className="benefit"><Heart size={20} strokeWidth={1.4}/><div><strong>Atención personalizada</strong><p>Resolvemos tus dudas y confirmamos disponibilidad por WhatsApp.</p></div></div></section>
    <footer className="footer"><div className="footer-top"><div><a className="brandmark" href="#inicio">VASNEAKER<small>T E N I S</small></a><p>{settings.footer_text}</p></div><div><h3>Explora</h3><div className="footer-links"><a href="#catalogo">Catálogo completo</a><a href="#colecciones">Colecciones</a><a href="#envios">Envíos y entregas</a></div></div><div><h3>Atención</h3><div className="footer-links"><a href="#envios">Información de envíos</a><a href="/admin">Acceso administrador</a>{settings.instagram_url && <a href={settings.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}</div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} VASNEAKER TENIS. Todos los derechos reservados.</span><span>Estilo que va contigo.</span></div></footer>

    {selected && <div className="overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null) }}><section className="product-modal" role="dialog" aria-modal="true" aria-label={`Producto ${selected.name}`}><button className="close-button" aria-label="Cerrar" style={{ position: 'absolute', right: 14, top: 10, zIndex: 2 }} onClick={() => setSelected(null)}><X/></button><div><div className="product-modal-image"><Image src={selectedImage || imageFor(selected)} alt={selected.name} width={900} height={1000} sizes="(max-width: 680px) 100vw, 50vw"/></div>{(selected.images ?? []).length > 1 && <div style={{ display: 'flex', gap: 8, padding: 10, background: '#ebe7df', overflowX: 'auto' }}>{selected.images!.map((img, i) => <button key={img.id ?? img.storage_path} onClick={() => setSelectedImage(imageUrl(img.storage_path))} aria-label={`Ver fotografía ${i + 1}`} style={{ padding: 0, border: selectedImage === imageUrl(img.storage_path) ? '1px solid var(--ink)' : '1px solid transparent', flex: '0 0 64px', background: 'transparent' }}><Image src={imageUrl(img.storage_path)} alt={img.alt || selected.name} width={64} height={64} style={{ width: 64, height: 64, objectFit: 'cover', mixBlendMode: 'multiply' }}/></button>)}</div>}</div><div className="product-modal-copy"><span className="eyebrow">{selected.brand_name}</span><h2 className="serif">{selected.name}</h2><div className="price">{money(selected.price_cop)}</div><p style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--muted)' }}>{selected.description || 'Un nuevo favorito para acompañar tu estilo.'}</p><div style={{ marginTop: 26 }}><span className="eyebrow">Selecciona tu talla</span><div className="size-grid">{selected.variants.map(v => <button key={v.id} className={`size-button ${selectedSize === v.size_label ? 'active' : ''}`} disabled={v.stock < 1} onClick={() => { setSelectedSize(v.size_label); setSelectedQty(1); setNotice('') }} aria-pressed={selectedSize === v.size_label}>{v.size_label}</button>)}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{selected.variants.find(v => v.size_label === selectedSize)?.stock ? `${selected.variants.find(v => v.size_label === selectedSize)?.stock} unidad(es) disponibles` : selected.variants.some(v => v.stock > 0) ? 'Las tallas agotadas no se pueden seleccionar.' : 'Este producto está agotado.'}</div></div>{selected.variants.some(v => v.stock > 0) && <div className="quantity-row"><label htmlFor="qty">Cantidad</label><input id="qty" className="field" type="number" min={1} max={selected.variants.find(v => v.size_label === selectedSize)?.stock ?? 1} value={selectedQty} onChange={e => setSelectedQty(Math.max(1, Number(e.target.value) || 1))} style={{ width: 78 }}/></div>}{notice && <div className="form-error" role="alert">{notice}</div>}<button className="button-dark" style={{ width: '100%', marginTop: 16 }} disabled={!selected.variants.some(v => v.stock > 0)} onClick={addToCart}><ShoppingBag size={16}/> Agregar a la bolsa</button><p style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.6, marginTop: 16 }}>La disponibilidad se confirma antes de coordinar el pedido. Los envíos nacionales se cotizan por WhatsApp.</p></div></section></div>}

    {cartOpen && <div className="overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) { setCartOpen(false); setCheckoutOpen(false); setNotice('') } }}><aside className="drawer" role="dialog" aria-modal="true" aria-label="Tu bolsa"><div className="drawer-head"><div><span className="eyebrow">VASNEAKER TENIS</span><h2 className="serif">Tu bolsa ({cartCount})</h2></div><button className="close-button" aria-label="Cerrar bolsa" onClick={() => { setCartOpen(false); setCheckoutOpen(false); setNotice('') }}><X/></button></div>{!cart.length ? <div className="empty-state" style={{ marginTop: 24 }}><ShoppingBag size={27} style={{ margin: '0 auto 12px' }}/><strong>Tu bolsa está vacía</strong><p style={{ fontSize: 12 }}>Encuentra un par que vaya contigo.</p><button className="button-dark" onClick={() => { setCartOpen(false); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }) }}>Explorar catálogo</button></div> : <><div className="cart-items">{cart.map(item => <div className="cart-line" key={item.key}><Image src={item.image} alt={item.name} width={100} height={110}/><div><h3>{item.name}</h3><p>{item.brand} · Talla {item.size}</p><p>{money(item.price)}</p><div className="quantity-control"><button aria-label="Reducir cantidad" onClick={() => changeQty(item.key, -1)}>−</button><span>{item.qty}</span><button aria-label="Aumentar cantidad" disabled={item.qty >= item.stock} onClick={() => changeQty(item.key, 1)}>+</button><button className="small-button" style={{ border: 0, padding: 3 }} onClick={() => removeItem(item.key)}>Quitar</button></div></div><strong style={{ fontSize: 12 }}>{money(item.price * item.qty)}</strong></div>)}</div><div className="cart-total"><div className="total-row"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="total-row"><span>Envío</span><span>{customer.city.trim() ? (shipping !== null ? money(shipping) : 'Por confirmar') : 'Se calcula según destino'}</span></div>{customer.city.trim() && <div className="total-row"><strong>Total estimado</strong><strong>{shipping !== null ? money(subtotal + shipping) : 'Por confirmar'}</strong></div>}<p className="cart-note">En Cali el envío cuesta {money(settings.cali_shipping_cop)}. Para el resto de Colombia, confirmamos la tarifa según destino y transportadora.</p>{!checkoutOpen ? <button className="button-dark" style={{ width: '100%' }} onClick={() => { setCheckoutOpen(true); setNotice('') }}>Finalizar pedido <ArrowRight size={15}/></button> : <div className="checkout-form"><span className="eyebrow">Datos de entrega</span><label>Nombre completo<input className="field" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Tu nombre" autoComplete="name"/></label><label>Ciudad o municipio<input className="field" value={customer.city} onChange={e => setCustomer({ ...customer, city: e.target.value })} placeholder="Ej. Cali" autoComplete="address-level2"/></label><label>Dirección de entrega<input className="field" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} placeholder="Calle, carrera, número" autoComplete="street-address"/></label><label>Indicaciones adicionales (opcional)<textarea className="field" rows={2} value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} placeholder="Barrio, referencia, horario…"/></label>{notice && <div className={notice.startsWith('WhatsApp') ? 'form-success' : 'form-error'} role="status">{notice}</div>}<button className="button-dark" style={{ width: '100%' }} onClick={sendWhatsApp}>Enviar pedido por WhatsApp <ArrowRight size={15}/></button><button className="button-outline" onClick={() => { setCheckoutOpen(false); setNotice('') }}>Volver a la bolsa</button><p className="cart-note">Al continuar se abrirá WhatsApp con tu resumen. El pedido no queda confirmado hasta que recibas respuesta de la tienda.</p></div>}</div></>}</aside></div>}
  </main>
}
