import Link from 'next/link'
import { ArrowLeftIcon, Icon } from '@/components/icons'
import { Container } from '@/components/ui/container'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeading } from '@/components/ui/section-heading'
import { cta, services } from '@/content/site'
import { cn } from '@/lib/utils'

/**
 * Shown twice: partway down the homepage, and as the whole of `/services`.
 * The page there has no hero, so it passes the top padding that clears the
 * floating header.
 */
export function Services({ className }: { className?: string }) {
  return (
    <section id="services" className={cn('bg-sand-50 py-20 lg:py-28', className)}>
      <Container>
        <Reveal>
          <SectionHeading title={services.title} description={services.description} />
        </Reveal>

        {/* Three across at the widest, not one row of everything: with six
            cards a five-column row leaves an orphan, and the copy in these
            cards needs a wider measure than a sixth of the container gives. */}
        {/*
          Three across on a phone, which leaves each tile about 106px on a 390px
          screen — too narrow for the description, so below `sm` the card shows
          its icon and title and nothing else. Six services then read as two
          tidy rows instead of six full screens of scrolling, and the whole tile
          is still the link, so nothing becomes unreachable. The prose comes
          back at `sm`, where two across gives it a measure worth reading.
        */}
        <ul className="mt-14 grid grid-cols-3 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {services.items.map((service, i) => (
            <Reveal as="li" key={service.slug} delay={i * 90} className="flex">
              <Link
                href={service.href ?? `/services/${service.slug}`}
                className="group bg-sand-100 hover:bg-sand-200 flex w-full flex-col rounded-[var(--radius-card)] p-3 transition-all duration-400 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] sm:p-6 lg:p-7"
              >
                <span className="bg-sand-200 group-hover:bg-sand-300 mx-auto grid size-11 place-items-center rounded-full transition-colors duration-300 sm:size-[3.75rem]">
                  <Icon
                    name={service.icon}
                    strokeWidth={1.3}
                    className="text-ink-700 size-5 transition-colors duration-300 group-hover:text-olive-700 sm:size-7"
                  />
                </span>

                <h3 className="text-ink-900 mt-3 text-center text-[0.75rem] leading-snug font-semibold sm:mt-5 sm:text-[0.9375rem]">
                  {service.title}
                </h3>

                <p className="text-ink-500 mt-3.5 hidden text-center text-[0.8125rem] leading-[2] sm:block">
                  {service.description}
                </p>

                {service.bullets ? (
                  <ul className="text-ink-500 mt-2 hidden list-disc space-y-1 ps-4 text-start text-[0.8125rem] leading-[1.9] marker:text-olive-400 sm:block">
                    {service.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}

                {/* `mt-auto` pins the link to the card floor so a row of
                    cards keeps a single baseline regardless of copy length. */}
                <span className="mt-auto hidden items-center gap-2 pt-7 text-[0.8125rem] font-medium text-olive-700 sm:inline-flex">
                  {service.cta ?? cta.more}
                  <ArrowLeftIcon
                    className="size-4 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:-translate-x-1"
                    strokeWidth={1.6}
                  />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  )
}
