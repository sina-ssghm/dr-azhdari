import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ServiceDetailPage } from '@/components/sections/service-detail-page'
import { serviceDetail } from '@/content/service-detail'
import { services } from '@/content/site'

/*
  Hypnotherapy is reachable by two routes, and both are load-bearing: the
  header nav and the homepage band point here, while the services grid points
  at /services/hypnotherapy. Rather than leave one of them on a holding page,
  both render the same record.

  `alternates.canonical` names /services/hypnotherapy as the one a search
  engine should index, so the duplicate does not split the page's ranking
  between two URLs.
*/
const SLUG = 'hypnotherapy'

const service = services.items.find((item) => item.slug === SLUG)

export const metadata: Metadata = {
  title: service?.title ?? 'هیپنوتراپی',
  description: service?.description,
  alternates: { canonical: `/services/${SLUG}` },
}

export default function HypnotherapyPage() {
  const detail = serviceDetail(SLUG)
  if (!service || !detail) notFound()

  return <ServiceDetailPage title={service.title} detail={detail} />
}
