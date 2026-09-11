import Image from 'next/image'
import { CalendarIcon, PhoneIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Reveal } from '@/components/ui/reveal'
import { booking, cta, site } from '@/content/site'
import { toPersianDigits } from '@/lib/utils'

export function BookingCta() {
  return (
    <section id="booking" className="bg-sand-50 pb-20 lg:pb-28">
      <Container>
        <Reveal>
          {/* RTL grid: the first cell renders on the right, so the column
              order below reads contact → divider → booking → image, which
              is exactly the design's right-to-left composition. */}
          <div className="bg-sand-200 grid overflow-hidden rounded-[var(--radius-band)] lg:grid-cols-[1fr_1px_1.05fr_1.15fr]">
            {/* Direct contact — last when stacked, so the booking CTA leads. */}
            <div className="order-4 px-7 py-9 lg:order-none lg:px-9 lg:py-11">
              <p className="text-ink-500 text-[0.8125rem]">{booking.direct.label}</p>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1">
                  <a
                    href={`tel:${site.phone}`}
                    dir="ltr"
                    className="text-ink-900 block text-start text-[1.4rem] font-bold tracking-wide transition-colors hover:text-olive-700"
                  >
                    {/* Persian on screen, Latin in the href — a tel: link with
                        Persian numerals does not dial. */}
                    {toPersianDigits(site.phone)}
                  </a>
                  <p className="text-ink-500 mt-2 text-[0.8125rem] leading-[1.9]">
                    {booking.direct.availability}
                  </p>
                  <p className="text-ink-500 text-[0.8125rem] leading-[1.9]">
                    {booking.direct.hours}
                  </p>
                </div>

                <span
                  aria-hidden="true"
                  className="border-line-strong grid size-14 shrink-0 place-items-center rounded-full border text-olive-700"
                >
                  <PhoneIcon className="size-[1.35rem]" />
                </span>
              </div>
            </div>

            {/* Divider */}
            <div
              aria-hidden="true"
              className="bg-line-strong/70 order-3 mx-7 h-px lg:order-none lg:mx-0 lg:my-11 lg:h-auto lg:w-px"
            />

            {/* Booking */}
            <div className="order-2 flex flex-col items-center px-7 py-9 text-center lg:order-none lg:px-8 lg:py-11">
              <h2 className="text-ink-900 inline-flex items-center gap-3 text-[1.3rem] font-bold lg:text-[1.45rem]">
                <CalendarIcon className="size-[1.35rem] shrink-0 text-olive-700" />
                {booking.title}
              </h2>

              <p className="text-ink-500 mt-4 max-w-sm text-[0.875rem] leading-[2]">
                {booking.description}
              </p>

              <Button
                href={cta.bookHref}
                size="lg"
                icon={<CalendarIcon className="size-full" />}
                className="mt-7"
              >
                {cta.book}
              </Button>
            </div>

            {/* Image — bleeds to the card edge */}
            <div className="relative order-1 h-52 w-full sm:h-64 lg:order-none lg:h-auto lg:min-h-[17rem]">
              <Image
                src={booking.image.src}
                alt={booking.image.alt}
                fill
                sizes="(max-width: 1023px) 100vw, 34vw"
                className="object-cover"
              />

              {/* Desktop only: dissolve into the band rather than butting
                  against it with a hard vertical seam. The cell sits at the
                  physical left in RTL, so the fade runs left-to-right.
                  When the band stacks on mobile the photo is a full-width
                  banner with nothing beside it, so it stays unfaded. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 hidden bg-[linear-gradient(to_right,transparent_38%,rgb(242_238_230/0.5)_72%,rgb(242_238_230/0.92)_92%,var(--color-sand-200)_100%)] lg:block"
              />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
