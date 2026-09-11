import type { Metadata } from 'next'
import { Services } from '@/components/sections/services'
import { services } from '@/content/site'

export const metadata: Metadata = {
  title: 'خدمات',
  description: services.description,
}

export default function ServicesPage() {
  // The same section the homepage shows. No hero here, so it carries the top
  // padding that clears the floating header.
  return <Services className="pt-32 lg:pt-40" />
}
