export type Category = 'hombre' | 'mujer' | 'ninos'
export type Product = {
  id: string
  slug: string
  name: string
  model?: string | null
  description?: string | null
  category: Category
  price_cop: number
  is_new: boolean
  is_featured: boolean
  status?: string
  brand_id?: string
  brand_name: string
  brand_slug?: string
  image_path?: string | null
  image_alt?: string | null
  total_stock?: number
  variants: { id: string; size_label: string; stock: number; sort_order?: number }[]
  images?: { id?: string; storage_path: string; alt?: string; is_primary?: boolean; position?: number }[]
}

export const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
export const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const demoProducts: Product[] = [
  { id: 'demo-1', slug: 'court-hueso', name: 'Court Hueso', model: 'Essential Low', description: 'Una silueta limpia para combinar todos los días. Diseño minimalista y versátil.', category: 'hombre', price_cop: 189900, is_new: true, is_featured: true, brand_name: 'VASNEAKER STUDIO', image_path: '/demo/court-hueso-1.png', total_stock: 12, variants: [{ id: 'd1-38', size_label: '38', stock: 2 }, { id: 'd1-39', size_label: '39', stock: 3 }, { id: 'd1-40', size_label: '40', stock: 4 }, { id: 'd1-41', size_label: '41', stock: 3 }], images: [{ storage_path: '/demo/court-hueso-1.png', alt: 'Court Hueso vista lateral', is_primary: true }, { storage_path: '/demo/court-hueso-2.png', alt: 'Court Hueso detalle' }] },
  { id: 'demo-2', slug: 'runner-carbon', name: 'Runner Carbon', model: 'Motion Series', description: 'Inspiración deportiva, materiales de aspecto técnico y comodidad para el ritmo diario.', category: 'hombre', price_cop: 229900, is_new: true, is_featured: false, brand_name: 'VASNEAKER STUDIO', image_path: '/demo/runner-carbon-1.png', total_stock: 9, variants: [{ id: 'd2-39', size_label: '39', stock: 2 }, { id: 'd2-40', size_label: '40', stock: 2 }, { id: 'd2-41', size_label: '41', stock: 3 }, { id: 'd2-42', size_label: '42', stock: 2 }], images: [{ storage_path: '/demo/runner-carbon-1.png', alt: 'Runner Carbon lateral', is_primary: true }, { storage_path: '/demo/runner-carbon-2.png', alt: 'Runner Carbon detalle' }] },
  { id: 'demo-3', slug: 'court-hueso-mujer', name: 'Court Hueso Mujer', model: 'Essential Low', description: 'Un básico de líneas depuradas para un estilo relajado y atemporal.', category: 'mujer', price_cop: 179900, is_new: false, is_featured: true, brand_name: 'VASNEAKER STUDIO', image_path: '/demo/court-hueso-2.png', total_stock: 6, variants: [{ id: 'd3-35', size_label: '35', stock: 1 }, { id: 'd3-36', size_label: '36', stock: 2 }, { id: 'd3-37', size_label: '37', stock: 3 }], images: [{ storage_path: '/demo/court-hueso-2.png', alt: 'Court Hueso para mujer', is_primary: true }] },
  { id: 'demo-4', slug: 'mini-court', name: 'Mini Court', model: 'Junior', description: 'Una silueta sencilla para acompañar sus planes y aventuras.', category: 'ninos', price_cop: 139900, is_new: true, is_featured: false, brand_name: 'VASNEAKER STUDIO', image_path: '/demo/court-hueso-1.png', total_stock: 0, variants: [{ id: 'd4-30', size_label: '30', stock: 0 }, { id: 'd4-31', size_label: '31', stock: 0 }], images: [{ storage_path: '/demo/court-hueso-1.png', alt: 'Mini Court', is_primary: true }] },
]
