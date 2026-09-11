import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PagePlaceholder } from '@/components/sections/page-placeholder'
import { ServiceDetailPage } from '@/components/sections/service-detail-page'
import { serviceDetail } from '@/content/service-detail'
import { services } from '@/content/site'

type Params = { slug: string }

/**
 * Cards that carry their own `href` point at a section that already exists, so
 * they get no detail page here — following one must not land on a placeholder.
 */
const detailPages = services.items.filter((service) => !service.href)

const findService = (slug: string) => detailPages.find((s) => s.slug === slug)

export function generateStaticParams(): Params[] {
  return detailPages.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const service = findService(slug)
  if (!service) return {}
  return { title: service.title, description: service.description }
}

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const service = findService(slug)
  if (!service) notFound()

  // A service with long-form copy gets the full page; the rest keep the
  // holding page until theirs is written.
  const detail = serviceDetail(slug)
  if (detail) return <ServiceDetailPage title={service.title} detail={detail} />

  return <PagePlaceholder title={service.title} description={service.description} />
}
