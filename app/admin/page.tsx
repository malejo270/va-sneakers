'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ImagePlus, LogOut, Package, Plus, RefreshCw, Save, Settings2, ShieldCheck, Trash2 } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { money, slugify } from '@/lib/store'

type Brand = { id: string; name: string; slug: string }
type AdminProduct = { id: string; name: string; slug: string; model: string | null; description: string; category: 'hombre' | 'mujer' | 'ninos'; price_cop: number; status: 'draft' | 'published' | 'hidden' | 'archived'; is_new: boolean; is_featured: boolean; brand_id: string; brands?: { name: string } | null; product_variants?: { id: string; size_label: string; stock: number }[]; product_images?: { id: string; storage_path: string; is_primary: boolean }[] }
type StoreSettings = { store_name: string; whatsapp_number: string; contact_email: string; cali_shipping_cop: number; national_shipping_message: string; instagram_url: string; tiktok_url: string; facebook_url: string; footer_text: string; low_stock_threshold: number }
const initialSettings: StoreSettings = { store_name: 'VASNEAKER TENIS', whatsapp_number: '', contact_email: '', cali_shipping_cop: 10000, national_shipping_message: 'Envíos a todo Colombia. La tarifa depende de la transportadora y del destino; la confirmamos por WhatsApp.', instagram_url: '', tiktok_url: '', facebook_url: '', footer_text: 'Sneakers urbanos y deportivos con envíos desde Cali a toda Colombia.', low_stock_threshold: 2 }
const emptyProduct = { name: '', model: '', description: '', category: 'hombre' as const, price_cop: '189900', status: 'draft' as const, is_new: false, is_featured: false, brand_id: '', sizes: '38:2, 39:2, 40:2, 41:2' }

export default function AdminPage() {
  const supabase = getSupabaseBrowser()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'products' | 'brands' | 'settings'>('products')
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [settings, setSettings] = useState<StoreSettings>(initialSettings)
  const [form, setForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const [brandName, setBrandName] = useState('')
  const [lowStock, setLowStock] = useState<any[]>([])

  const loadAdminData = useCallback(async () => {
    if (!supabase) { setChecking(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setChecking(false); return }
    const { data: profile, error: profileError } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (profileError || !profile?.is_admin) {
      await supabase.auth.signOut()
      setLoginError('Esta cuenta no tiene permisos de administrador. Revisa el perfil en Supabase.')
      setChecking(false)
      return
    }
    setUserEmail(user.email ?? '')
    await loadTables()
    setChecking(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const loadTables = async () => {
    if (!supabase) return
    setError('')
    const [pr, br, st, vr] = await Promise.all([
      supabase.from('products').select('id,name,slug,model,description,category,price_cop,status,is_new,is_featured,brand_id,brands(name),product_variants(id,size_label,stock),product_images(id,storage_path,is_primary)').order('created_at', { ascending: false }),
      supabase.from('brands').select('id,name,slug').order('name'),
      supabase.from('store_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('product_variants').select('id,size_label,stock,products(name,brand_id,brands(name))').gt('stock', 0),
    ])
    if (pr.error || br.error) { setError(pr.error?.message ?? br.error?.message ?? 'No se pudieron cargar los datos.'); return }
    setProducts((pr.data ?? []) as unknown as AdminProduct[])
    setBrands((br.data ?? []) as Brand[])
    if (st.data) setSettings({ ...initialSettings, ...st.data, whatsapp_number: st.data.whatsapp_number ?? '', contact_email: st.data.contact_email ?? '', instagram_url: st.data.instagram_url ?? '', tiktok_url: st.data.tiktok_url ?? '', facebook_url: st.data.facebook_url ?? '' })
    setLowStock((vr.data ?? []).filter((v: any) => Number(v.stock) <= Number(st.data?.low_stock_threshold ?? initialSettings.low_stock_threshold)))
    setForm(current => ({ ...current, brand_id: current.brand_id || br.data?.[0]?.id || '' }))
  }

  useEffect(() => { void loadAdminData() }, [loadAdminData])

  const login = async (e: FormEvent) => {
    e.preventDefault(); setLoginError('')
    if (!supabase) { setLoginError('Primero configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel.'); return }
    setBusy(true)
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password })
    if (signError) { setLoginError('No se pudo iniciar sesión. Revisa el correo, la contraseña y la configuración de Supabase.'); setBusy(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user?.id ?? '').maybeSingle()
    if (!profile?.is_admin) {
      await supabase.auth.signOut()
      setLoginError('La cuenta existe, pero no tiene permisos administrativos. Sigue la guía para habilitar tu usuario.'); setBusy(false); return
    }
    setUserEmail(user?.email ?? email); await loadTables(); setChecking(false); setBusy(false)
  }

  const signOut = async () => { await supabase?.auth.signOut(); setUserEmail(''); setProducts([]); setBrands([]) }
  const editProduct = (p: AdminProduct) => {
    const variants = (p.product_variants ?? []).map(v => `${v.size_label}:${v.stock}`).join(', ')
    setForm({ name: p.name, model: p.model ?? '', description: p.description ?? '', category: p.category, price_cop: String(p.price_cop), status: p.status, is_new: p.is_new, is_featured: p.is_featured, brand_id: p.brand_id, sizes: variants })
    setEditingId(p.id); setImageFiles(null); setTab('products'); setMessage('Editando: ' + p.name); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const resetForm = () => { setForm({ ...emptyProduct, brand_id: brands[0]?.id ?? '' }); setEditingId(null); setImageFiles(null); setMessage('') }

  const saveProduct = async (e: FormEvent) => {
    e.preventDefault(); if (!supabase) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (!form.brand_id) throw new Error('Primero crea una marca y selecciónala.')
      const price = Number(form.price_cop)
      if (!Number.isInteger(price) || price <= 0) throw new Error('El precio debe ser un número entero positivo en COP.')
      const parsed = form.sizes.split(',').map(s => s.trim()).filter(Boolean).map(s => {
        const [size_label, stockRaw] = s.split(':').map(x => x.trim())
        const stock = Number(stockRaw)
        if (!size_label || !Number.isInteger(stock) || stock < 0) throw new Error(`Formato de talla inválido: "${s}". Usa talla:stock, por ejemplo 39:3.`)
        return { size_label, stock, sort_order: Number(size_label) || 0 }
      })
      if (!parsed.length) throw new Error('Añade al menos una talla. Usa el formato 38:2, 39:0, 40:4.')
      if (new Set(parsed.map(v => v.size_label)).size !== parsed.length) throw new Error('No repitas una misma talla.')
      const base = { name: form.name.trim(), model: form.model.trim() || null, description: form.description.trim(), category: form.category, price_cop: price, status: form.status, is_new: form.is_new, is_featured: form.is_featured, brand_id: form.brand_id }
      if (base.name.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres.')
      let productId = editingId
      if (editingId) {
        const { error: updateError } = await supabase.from('products').update(base).eq('id', editingId)
        if (updateError) throw updateError
      } else {
        const baseSlug = slugify(form.name) || `producto-${Date.now()}`
        const { data, error: insertError } = await supabase.from('products').insert({ ...base, slug: `${baseSlug}-${Math.random().toString(36).slice(2, 7)}` }).select('id').single()
        if (insertError) throw insertError
        productId = data.id
      }
      const { error: variantsError } = await supabase.from('product_variants').upsert(parsed.map(v => ({ ...v, product_id: productId })), { onConflict: 'product_id,size_label' })
      if (variantsError) throw variantsError
      const existingVariants = await supabase.from('product_variants').select('id,size_label').eq('product_id', productId)
      const staleIds = (existingVariants.data ?? []).filter(v => !parsed.some(item => item.size_label === v.size_label)).map(v => v.id)
      if (staleIds.length) {
        const { error: deleteVariantsError } = await supabase.from('product_variants').delete().in('id', staleIds)
        if (deleteVariantsError) throw deleteVariantsError
      }
      if (imageFiles?.length && productId) {
        const existing = await supabase.from('product_images').select('id').eq('product_id', productId)
        let position = existing.data?.length ?? 0
        for (let fileIndex = 0; fileIndex < imageFiles.length; fileIndex++) {
          const file = imageFiles.item(fileIndex)
          if (!file) continue
          if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: usa una imagen de máximo 5 MB.`)
          const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
          const path = `${productId}/${Date.now()}-${safeName}`
          const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { upsert: false, contentType: file.type })
          if (uploadError) throw uploadError
          const { error: imageError } = await supabase.from('product_images').insert({ product_id: productId, storage_path: path, alt: `${form.name} - fotografía ${position + 1}`, position, is_primary: position === 0 })
          if (imageError) throw imageError
          position++
        }
      }
      setMessage(editingId ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.')
      resetForm(); await loadTables()
    } catch (err: any) { setError(err?.message ?? 'No se pudo guardar el producto.') }
    finally { setBusy(false) }
  }

  const deleteProduct = async (p: AdminProduct) => {
    if (!supabase || !window.confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return
    setBusy(true); setError(''); const imgs = await supabase.from('product_images').select('storage_path').eq('product_id', p.id)
    if (imgs.data?.length) await supabase.storage.from('product-images').remove(imgs.data.map(i => i.storage_path))
    const { error: delError } = await supabase.from('products').delete().eq('id', p.id)
    if (delError) setError(delError.message); else setMessage('Producto eliminado.')
    await loadTables(); setBusy(false)
  }
  const toggleStatus = async (p: AdminProduct) => {
    if (!supabase) return
    const next = p.status === 'published' ? 'hidden' : 'published'
    const { error: updateError } = await supabase.from('products').update({ status: next }).eq('id', p.id)
    if (updateError) setError(updateError.message); else setMessage(`Producto ${next === 'published' ? 'publicado' : 'ocultado'}.`)
    await loadTables()
  }
  const createBrand = async (e: FormEvent) => {
    e.preventDefault(); if (!supabase || !brandName.trim()) return
    const { error: createError } = await supabase.from('brands').insert({ name: brandName.trim(), slug: slugify(brandName) })
    if (createError) setError(createError.message); else { setBrandName(''); setMessage('Marca creada.') }
    await loadTables()
  }
  const editBrand = async (brand: Brand) => {
    if (!supabase) return
    const name = window.prompt('Nuevo nombre de la marca:', brand.name)?.trim()
    if (!name || name === brand.name) return
    const { error: editError } = await supabase.from('brands').update({ name, slug: slugify(name) }).eq('id', brand.id)
    if (editError) setError(editError.message); else setMessage('Marca actualizada.')
    await loadTables()
  }
  const uploadBrandLogo = async (brand: Brand, file?: File) => {
    if (!supabase || !file) return
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) { setError('El logo debe ser una imagen de máximo 2 MB.'); return }
    setError(''); setMessage('Subiendo logo…')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
    const path = `${brand.id}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('brand-logos').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) { setError(uploadError.message); setMessage(''); return }
    const { error: updateError } = await supabase.from('brands').update({ logo_path: path }).eq('id', brand.id)
    if (updateError) { setError(updateError.message); setMessage(''); return }
    setMessage(`Logo actualizado para ${brand.name}.`); await loadTables()
  }

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault(); if (!supabase) return
    const phone = settings.whatsapp_number.replace(/\D/g, '')
    if (phone && !/^57\d{10}$/.test(phone)) { setError('El WhatsApp debe tener 12 dígitos: 57 seguido de los 10 dígitos del celular.'); return }
    const { error: settingsError } = await supabase.from('store_settings').update({ ...settings, whatsapp_number: phone || null, contact_email: settings.contact_email || null, instagram_url: settings.instagram_url || null, tiktok_url: settings.tiktok_url || null, facebook_url: settings.facebook_url || null }).eq('id', 1)
    if (settingsError) setError(settingsError.message); else setMessage('Configuración guardada.')
    await loadTables()
  }

  if (checking) return <div className="admin-login"><div className="admin-login-card"><span className="eyebrow">VASNEAKER TENIS</span><p>Verificando acceso…</p></div></div>
  if (!userEmail) return <main className="admin-login"><form className="admin-login-card form-stack" onSubmit={login}><a className="brandmark" href="/">VASNEAKER<small>T E N I S</small></a><div><h1 className="serif" style={{ marginTop: 30 }}>Administración</h1><p>Ingresa con la cuenta autorizada para gestionar el catálogo y el inventario de VASNEAKER TENIS.</p></div>{!supabase && <div className="form-error">Configura las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel para habilitar el acceso.</div>}<label className="admin-label">Correo electrónico<input className="field" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@tutienda.com"/></label><label className="admin-label">Contraseña<input className="field" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña"/></label>{loginError && <div className="form-error" role="alert">{loginError}</div>}<button className="button-dark" disabled={busy || !supabase}>{busy ? 'Verificando…' : 'Iniciar sesión'} <ShieldCheck size={16}/></button><a href="/" className="text-link" style={{ textAlign: 'center', marginTop: 8 }}><ArrowLeft size={13} style={{ display: 'inline', verticalAlign: 'middle' }}/> Volver a la tienda</a><p style={{ marginBottom: 0, fontSize: 10 }}>La cuenta debe crearse en Supabase y habilitarse como administrador siguiendo la guía incluida en el proyecto.</p></form></main>

  return <div className="admin-shell"><header className="admin-header"><a className="brandmark" href="/">VASNEAKER<small>T E N I S · ADMIN</small></a><div className="admin-actions"><span style={{ fontSize: 11, color: 'var(--muted)' }}>{userEmail}</span><button className="small-button" onClick={() => router.push('/')}><ArrowLeft size={13} style={{ display: 'inline', verticalAlign: 'middle' }}/> Ver tienda</button><button className="small-button" onClick={signOut}><LogOut size={13} style={{ display: 'inline', verticalAlign: 'middle' }}/> Salir</button></div></header><main className="admin-main"><span className="eyebrow">Panel privado</span><h1 className="admin-title serif">Administración de tienda</h1><p className="admin-subtitle">Gestiona catálogo, existencias y datos comerciales desde un solo lugar.</p>
    <div className="admin-grid"><div className="admin-panel"><span className="eyebrow">Catálogo</span><h2 className="serif" style={{ fontSize: 34, margin: '10px 0' }}>{products.filter(p => p.status === 'published').length}</h2><span style={{ fontSize: 12, color: 'var(--muted)' }}>Productos publicados</span></div><div className="admin-panel"><span className="eyebrow">Inventario</span><h2 className="serif" style={{ fontSize: 34, margin: '10px 0' }}>{products.filter(p => (p.product_variants ?? []).reduce((s, v) => s + v.stock, 0) === 0).length}</h2><span style={{ fontSize: 12, color: 'var(--muted)' }}>Productos agotados</span></div><div className="admin-panel"><span className="eyebrow">Marcas</span><h2 className="serif" style={{ fontSize: 34, margin: '10px 0' }}>{brands.length}</h2><span style={{ fontSize: 12, color: 'var(--muted)' }}>Marcas registradas</span></div></div>
    <div className="admin-actions" style={{ margin: '24px 0' }}><button className={tab === 'products' ? 'button-dark' : 'button-outline'} onClick={() => setTab('products')}><Package size={15}/> Productos e inventario</button><button className={tab === 'brands' ? 'button-dark' : 'button-outline'} onClick={() => setTab('brands')}>Marcas</button><button className={tab === 'settings' ? 'button-dark' : 'button-outline'} onClick={() => setTab('settings')}><Settings2 size={15}/> Configuración</button><button className="small-button" onClick={() => void loadTables()}><RefreshCw size={13} style={{ display: 'inline', verticalAlign: 'middle' }}/> Actualizar</button></div>
    {error && <div className="form-error" style={{ marginBottom: 15 }} role="alert">{error}</div>}{message && <div className="form-success" style={{ marginBottom: 15 }} role="status">{message}</div>}
    {tab === 'products' && <><section className="admin-panel"><h2 className="serif" style={{ fontSize: 25, marginTop: 0 }}>{editingId ? 'Editar producto' : 'Añadir producto'}</h2><p className="admin-subtitle">Las tallas se escriben como talla:stock, separadas por comas. Ejemplo: 38:2, 39:0, 40:5.</p><form onSubmit={saveProduct} className="form-stack"><div className="admin-form-grid"><label className="admin-label">Nombre del producto<input className="field" required minLength={2} maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej. Court Hueso"/></label><label className="admin-label">Modelo<input className="field" maxLength={80} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="Modelo o colección"/></label><label className="admin-label">Marca<select className="field" required value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}><option value="">Selecciona marca</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="admin-label">Categoría<select className="field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as typeof form.category })}><option value="hombre">Hombre</option><option value="mujer">Mujer</option><option value="ninos">Niños</option></select></label><label className="admin-label">Precio (COP, sin puntos)<input className="field" type="number" min={1} max={100000000} step={1} required value={form.price_cop} onChange={e => setForm({ ...form, price_cop: e.target.value })}/></label><label className="admin-label">Estado<select className="field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as typeof form.status })}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="hidden">Oculto</option><option value="archived">Archivado</option></select></label></div><label className="admin-label">Descripción<textarea className="field" rows={3} maxLength={4000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe el producto…"/></label><label className="admin-label">Tallas y stock<input className="field" required value={form.sizes} onChange={e => setForm({ ...form, sizes: e.target.value })} placeholder="38:2, 39:0, 40:5"/></label><div className="admin-actions"><label className="small-button"><input type="checkbox" checked={form.is_new} onChange={e => setForm({ ...form, is_new: e.target.checked })}/> Nuevo</label><label className="small-button"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })}/> Destacado</label></div><label className="admin-label">Fotografías (máximo 5 MB por imagen)<input className="field" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={e => setImageFiles(e.target.files)}/><span>Las nuevas imágenes se añadirán a las existentes. Formatos: JPG, PNG, WebP o AVIF.</span></label><div className="admin-actions"><button className="button-dark" disabled={busy || brands.length === 0}><Save size={15}/>{busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear producto'}</button>{editingId && <button type="button" className="button-outline" onClick={resetForm}>Cancelar edición</button>}</div></form></section><section className="admin-panel"><h2 className="serif" style={{ fontSize: 25, marginTop: 0 }}>Productos e inventario</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Producto</th><th>Marca</th><th>Precio</th><th>Tallas / stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><strong>{p.name}</strong><div style={{ color: 'var(--muted)', marginTop: 4 }}>{p.category}</div></td><td>{p.brands?.name ?? brands.find(b => b.id === p.brand_id)?.name ?? '—'}</td><td>{money(p.price_cop)}</td><td>{(p.product_variants ?? []).map(v => `${v.size_label}: ${v.stock}`).join(' · ') || 'Sin tallas'}</td><td><span className="status-tag">{p.status === 'published' ? 'Publicado' : p.status === 'hidden' ? 'Oculto' : p.status === 'archived' ? 'Archivado' : 'Borrador'}</span></td><td><div className="admin-actions"><button className="small-button" onClick={() => editProduct(p)}>Editar</button><button className="small-button" onClick={() => void toggleStatus(p)}>{p.status === 'published' ? 'Ocultar' : 'Publicar'}</button><button className="small-button danger" onClick={() => void deleteProduct(p)}><Trash2 size={12}/></button></div></td></tr>)}</tbody></table>{products.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Todavía no hay productos. Crea una marca y luego añade el primer producto.</p>}</div></section>{lowStock.length > 0 && <section className="admin-panel"><h2 className="serif" style={{ fontSize: 23, marginTop: 0 }}>Existencias bajas</h2><p className="admin-subtitle">Tallas con 1 o 2 unidades. Ajusta el umbral en la configuración SQL si lo necesitas.</p>{lowStock.map((v: any) => <div key={v.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }}>{v.products?.name ?? 'Producto'} · Talla {v.size_label} · <strong>{v.stock} unidades</strong></div>)}</section>}</>}
    {tab === 'brands' && <><section className="admin-panel"><h2 className="serif" style={{ fontSize: 25, marginTop: 0 }}>Añadir marca</h2><form onSubmit={createBrand} className="admin-actions"><input className="field" style={{ maxWidth: 360 }} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Nombre de la marca" required maxLength={80}/><button className="button-dark"><Plus size={15}/> Crear marca</button></form></section><section className="admin-panel"><h2 className="serif" style={{ fontSize: 25, marginTop: 0 }}>Marcas registradas</h2>{brands.map(b => <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 15, flexWrap: 'wrap', borderBottom: '1px solid var(--line)', padding: '14px 0' }}><div><strong style={{ fontSize: 13 }}>{b.name}</strong><div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{b.slug}</div></div><div className="admin-actions"><label className="small-button"><ImagePlus size={12} style={{ display: 'inline', verticalAlign: 'middle' }}/> Subir logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={e => { void uploadBrandLogo(b, e.target.files?.[0]); e.currentTarget.value = '' }}/></label><button className="small-button" onClick={() => void editBrand(b)}>Editar nombre</button><button className="small-button danger" onClick={async () => { if (!supabase || !window.confirm(`¿Eliminar la marca ${b.name}? No se podrá si tiene productos asociados.`)) return; const { error: e } = await supabase.from('brands').delete().eq('id', b.id); if (e) setError(e.message); else setMessage('Marca eliminada.'); await loadTables() }}><Trash2 size={13}/> Eliminar</button></div></div>)}</section></>}
    {tab === 'settings' && <section className="admin-panel"><h2 className="serif" style={{ fontSize: 25, marginTop: 0 }}>Configuración comercial</h2><p className="admin-subtitle">Estos datos se utilizan en la tienda y en el resumen del pedido.</p><form className="form-stack" onSubmit={saveSettings}><div className="admin-form-grid"><label className="admin-label">Nombre de tienda<input className="field" value={settings.store_name} onChange={e => setSettings({ ...settings, store_name: e.target.value })} required/></label><label className="admin-label">WhatsApp internacional<input className="field" value={settings.whatsapp_number} onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })} placeholder="573001234567"/><span>Formato: 57 + 10 dígitos. Sin +, espacios ni guiones.</span></label><label className="admin-label">Correo de contacto<input className="field" type="email" value={settings.contact_email} onChange={e => setSettings({ ...settings, contact_email: e.target.value })}/></label><label className="admin-label">Envío en Cali (COP)<input className="field" type="number" min={0} value={settings.cali_shipping_cop} onChange={e => setSettings({ ...settings, cali_shipping_cop: Number(e.target.value) })} required/></label><label className="admin-label">Instagram (URL)<input className="field" type="url" value={settings.instagram_url} onChange={e => setSettings({ ...settings, instagram_url: e.target.value })} placeholder="https://instagram.com/…"/></label><label className="admin-label">TikTok (URL)<input className="field" type="url" value={settings.tiktok_url} onChange={e => setSettings({ ...settings, tiktok_url: e.target.value })}/></label><label className="admin-label">Facebook (URL)<input className="field" type="url" value={settings.facebook_url} onChange={e => setSettings({ ...settings, facebook_url: e.target.value })}/></label><label className="admin-label">Umbral de stock bajo<input className="field" type="number" min={0} max={1000} value={settings.low_stock_threshold} onChange={e => setSettings({ ...settings, low_stock_threshold: Number(e.target.value) })}/></label></div><label className="admin-label">Mensaje de envíos nacionales<textarea className="field" rows={3} maxLength={300} value={settings.national_shipping_message} onChange={e => setSettings({ ...settings, national_shipping_message: e.target.value })}/></label><label className="admin-label">Texto de pie de página<textarea className="field" rows={2} maxLength={300} value={settings.footer_text} onChange={e => setSettings({ ...settings, footer_text: e.target.value })}/></label><button className="button-dark" disabled={busy}><Save size={15}/> Guardar configuración</button></form></section>}
    <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 24 }}>La protección de las operaciones depende de las políticas RLS configuradas en Supabase. No compartas la contraseña de esta cuenta.</p></main></div>
}
