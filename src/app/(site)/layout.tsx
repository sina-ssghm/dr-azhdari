import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { services, site } from '@/content/site'

/**
 * A stale prerender heals itself within the hour.
 *
 * The footer's contact details are admin-editable and saving them calls
 * `revalidatePath('/', 'layout')`, but that rewrite lands in the container's
 * writable layer — nothing under `/app/.next` is bind-mounted — and
 * `docker compose build web && up -d --force-recreate web` throws that layer
 * away. Without a window here `initialRevalidate` is infinite, so every
 * static page under this layout would serve the defaults from `content/site.ts`
 * again after each deploy until an admin reopened the settings form and
 * pressed save. An hour, not less: the only thing behind it is a contact
 * block that changes about never, and the pages are otherwise pure content.
 *
 * This does not make anything dynamic. The routes that read the database on
 * every request already say `force-dynamic` for themselves, and that beats an
 * inherited revalidate.
 */
export const revalidate = 3600

/** Structured data so search engines surface the practice correctly. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  name: site.name,
  description: site.role,
  telephone: site.phoneIntl,
  url: site.url,
  medicalSpecialty: 'Psychiatric',
  sameAs: [site.instagramUrl],
  areaServed: { '@type': 'Country', name: 'Iran' },
  // Derived from the services list rather than duplicated — a hand-kept copy
  // silently drifts every time a service is renamed or removed.
  availableService: services.items.map((service) => ({
    '@type': 'MedicalTherapy',
    name: service.title,
  })),
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:end-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-olive-700 focus:px-5 focus:py-3 focus:text-sm focus:text-white"
      >
        رفتن به محتوای اصلی
      </a>

      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />

      <script
        type="application/ld+json"
        // Static, developer-authored object — no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}
