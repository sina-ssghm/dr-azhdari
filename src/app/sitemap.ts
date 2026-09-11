import type { MetadataRoute } from 'next'
import { nav, services, site } from '@/content/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    ...nav.map((item) => item.href),
    '/booking',
    /*
      Only the services that actually have a detail page. A card carrying its
      own `href` is a signpost to a section that already exists, and
      `/services/[slug]` generates nothing for it — so mapping every item here
      was publishing /services/personality-tests, which answers 404.
    */
    ...services.items
      .filter((service) => !service.href)
      .map((service) => `/services/${service.slug}`),
  ]

  return routes.map((route) => ({
    url: new URL(route, site.url).toString(),
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }))
}
