import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Ornament } from '@/components/ui/ornament'

/**
 * The same hour-long window the `(site)` layout takes, and for the same
 * reason: this page carries the admin-editable footer, it is prerendered into
 * the image, and a rebuild discards the revalidation that a settings save
 * wrote into the container's writable layer. It cannot inherit that setting —
 * it sits outside the `(site)` group — so it repeats it.
 */
export const revalidate = 3600

/**
 * Global 404. Lives at the root (outside the `(site)` group) so it also
 * catches URLs that match no segment at all, which means it has to pull in
 * the site chrome itself.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="bg-sand-200 pt-36 pb-24 lg:pt-48 lg:pb-32">
          <Container className="flex flex-col items-center text-center">
            <p className="font-display text-[3.5rem] leading-none font-bold text-olive-600">
              ۴۰۴
            </p>
            <h1 className="font-display text-ink-900 mt-5 text-[1.5rem] font-bold lg:text-[1.875rem]">
              صفحه مورد نظر پیدا نشد
            </h1>
            <Ornament className="mt-4" />
            <p className="text-ink-500 mt-6 max-w-md text-[0.9375rem] leading-[2.1]">
              ممکن است نشانی را اشتباه وارد کرده باشید یا این صفحه جابه‌جا شده باشد.
            </p>
            <Button href="/" size="lg" className="mt-9">
              بازگشت به صفحه اصلی
            </Button>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
