import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * `standalone` emits a self-contained server bundle in `.next/standalone`,
   * which is what we deploy to the VPS / Iranian host (and what the Dockerfile
   * copies). It keeps the runtime image small and avoids shipping node_modules.
   */
  output: 'standalone',

  poweredByHeader: false,

  experimental: {
    /**
     * Server Actions cap the request body at 1 MB by default, which silently
     * rejects any article PDF worth publishing. Raised just past the 25 MB the
     * upload form itself enforces, so the form's own message is what a large
     * file meets rather than an opaque framework error.
     */
    serverActions: { bodySizeLimit: '26mb' },
  },

  // Keep the Postgres driver out of the bundler and load it from node_modules
  // at runtime — the standard treatment for database drivers.
  serverExternalPackages: ['pg'],

  images: {
    // Everything is served from /public today. When the CMS/booking phase adds
    // remote images, whitelist their hosts here.
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig
