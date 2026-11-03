/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy-Report-Only',
    value:
      "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://api.github.com https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self' blob:; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; frame-ancestors 'none'",
  },
]

const nextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['takumi-js', '@takumi-rs/core'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
