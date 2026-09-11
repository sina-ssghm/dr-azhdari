import type { MetadataRoute } from 'next'
import { site } from '@/content/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The admin panel is unlinked and password-protected; keeping it out of
      // the index avoids advertising the URL. Not a security control.
      disallow: ['/admin', '/admin/'],
    },
    sitemap: new URL('/sitemap.xml', site.url).toString(),
  }
}
