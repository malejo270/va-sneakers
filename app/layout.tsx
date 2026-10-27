import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'VASNEAKER TENIS | Sneakers para tu estilo', template: '%s | VASNEAKER TENIS' },
  description: 'Encuentra tu próximo par en VASNEAKER TENIS. Sneakers urbanos y deportivos con envíos desde Cali a toda Colombia.',
  applicationName: 'VASNEAKER TENIS',
  keywords: ['tenis', 'sneakers', 'zapatillas', 'Cali', 'Colombia'],
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
  openGraph: { title: 'VASNEAKER TENIS', description: 'Sneakers urbanos y deportivos con envíos desde Cali a toda Colombia.', type: 'website', locale: 'es_CO' },
}
export const viewport: Viewport = { themeColor: '#f7f5f0', colorScheme: 'light' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-CO"><body>{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
