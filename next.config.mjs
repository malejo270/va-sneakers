/** @type {import('next').NextConfig} */
const remotePatterns = []
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
    remotePatterns.push({ protocol: supabaseUrl.protocol.replace(':', ''), hostname: supabaseUrl.hostname })
  } catch {
    // La aplicación muestra recursos locales hasta que se configure una URL válida.
  }
}

const nextConfig = {
  images: { remotePatterns },
}
export default nextConfig
