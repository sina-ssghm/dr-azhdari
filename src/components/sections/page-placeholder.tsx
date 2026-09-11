import { CalendarIcon, PhoneIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Ornament } from '@/components/ui/ornament'
import { cta, site } from '@/content/site'

/**
 * Phase 1 ships the homepage only. The nav links still resolve to real
 * routes so nothing 404s and the URLs are already correct for SEO — each
 * one renders this on-brand holding page until its design is approved.
 */
export function PagePlaceholder({
  title,
  description = 'محتوای این صفحه در حال آماده‌سازی است. برای دریافت مشاوره می‌توانید همین حالا تماس بگیرید یا جلسه خود را رزرو کنید.',
}: {
  title: string
  description?: string
}) {
  return (
    <section className="bg-sand-200 pt-36 pb-24 lg:pt-48 lg:pb-32">
      <Container className="flex flex-col items-center text-center">
        <h1 className="font-display text-ink-900 text-[2rem] font-bold lg:text-[2.5rem]">
          {title}
        </h1>

        <Ornament className="mt-4" />

        <p className="text-ink-500 mt-6 max-w-xl text-[0.9375rem] leading-[2.1]">
          {description}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          <Button
            href={`tel:${site.phone}`}
            variant="outline"
            size="lg"
            icon={<PhoneIcon className="size-full" />}
          >
            تماس مستقیم
          </Button>
          <Button
            href={cta.bookHref}
            size="lg"
            icon={<CalendarIcon className="size-full" />}
          >
            {cta.book}
          </Button>
        </div>
      </Container>
    </section>
  )
}
