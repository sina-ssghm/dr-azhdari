import type { Metadata, Viewport } from 'next'
import { site } from '@/content/site'
import { vazirmatn } from '@/lib/fonts'
import './globals.css'

/**
 * Root layout: document shell only.
 *
 * The public site's header and footer live in `(site)/layout.tsx` so that the
 * admin panel under /admin can render its own chrome without inheriting them.
 */

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | ${site.role}`,
    template: `%s | ${site.name}`,
  },
  description:
    'روان‌درمانی تخصصی، هیپنوتراپی و مشاوره حرفه‌ای برای بهبود کیفیت زندگی و ساختن رابطه‌ای سالم با خود و دیگران. مشاوره حضوری و آنلاین با محرمانگی کامل.',
  keywords: [
    'روان‌شناس',
    'مشاوره روان‌شناسی',
    'هیپنوتراپی',
    'هیپنوتیزم درمانی',
    'مشاوره آنلاین',
    'مشاوره روابط و خانواده',
    'دکتر زهره اژدری',
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: site.url,
    siteName: site.name,
    title: `${site.name} | ${site.role}`,
    description:
      'روان‌درمانی تخصصی، هیپنوتراپی و مشاوره حرفه‌ای — مشاوره حضوری و آنلاین با محرمانگی کامل.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

export const viewport: Viewport = {
  themeColor: '#f2eee6',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-dvh antialiased">
        <noscript>
          {/* Scroll-reveal is progressive enhancement — never hide content without JS. */}
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  )
}
