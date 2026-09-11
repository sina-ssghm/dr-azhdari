import type { Metadata } from 'next'
import { AboutPage } from '@/components/sections/about-page'
import { about } from '@/content/about'

export const metadata: Metadata = {
  title: about.metaTitle,
  description: about.metaDescription,
}

export default function Page() {
  return <AboutPage />
}
