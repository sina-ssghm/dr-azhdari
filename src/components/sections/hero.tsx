import Image from 'next/image'
import { CalendarIcon, Icon, PlayIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Reveal } from '@/components/ui/reveal'
import { cta, hero } from '@/content/site'
import { cn } from '@/lib/utils'

/**
 * Note on direction: the page is RTL, so text flow uses logical properties
 * (start/end). The portrait is a fixed decorative element pinned to the
 * physical right edge exactly as in the design, so it uses `right-0` and
 * physical gradient directions deliberately.
 */
export function Hero() {
  return (
    /* The hero height tracks viewport WIDTH (42vw, floored at 44rem for the
       copy). That keeps the portrait slot at a near-constant aspect ratio as
       the window widens, which is what makes a single `object-position` value
       hold everywhere — a fixed percentage drifts badly otherwise, because the
       amount of image overflowing the frame grows with width. */
    <section className="bg-sand-200 relative isolate overflow-hidden lg:min-h-[max(44rem,42vw)]">
      {/* Portrait */}
      {/* Mobile height scales with the screen (capped at 30rem) so the portrait
          gets real presence on a phone instead of a thin strip; desktop hands
          height control back to the section. */}
      {/* Narrower slot on desktop than the raw design suggests: `object-cover`
          scales this portrait by WIDTH, so the column width is what sets how
          large the subject reads. 54% lands her at the design's scale. */}
      <div className="relative h-[min(118vw,30rem)] w-full sm:h-[34rem] lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[58%] xl:w-[54%]">
        <Image
          src={hero.image.src}
          alt={hero.image.alt}
          fill
          priority
          fetchPriority="high"
          sizes="(max-width: 1023px) 100vw, (max-width: 1279px) 58vw, 54vw"
          // Desktop centres the crop; the section's width-linked height keeps
          // the frame stable so this stays correct from 1024px to ultrawide.
          // Mobile sits higher for a face-led crop in the tall banner.
          className="object-cover object-[50%_30%] lg:object-center"
        />

        {/* Blend into the cream: vertically on mobile, horizontally on desktop. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-sand-200)_1%,rgb(242_238_230/0.35)_28%,transparent_58%)] lg:hidden"
        />
        {/* The design's mockup had a plain cream wall behind the subject; the
            real photo has a lit lamp and dark shelving on that side, which the
            old narrow fade left showing through under the copy. Start the fade
            earlier and ramp harder so it is pure cream well before the text. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden bg-[linear-gradient(to_left,transparent_58%,rgb(242_238_230/0.45)_74%,rgb(242_238_230/0.88)_88%,var(--color-sand-200)_97%)] lg:block"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 hidden h-14 bg-[linear-gradient(to_top,var(--color-sand-200),transparent)] lg:block"
        />
      </div>

      <Container className="relative pt-6 pb-14 sm:pb-16 lg:pt-40 lg:pb-14">
        {/* `ms-auto` pushes the column to the inline end — the left half in
            RTL — so the copy sits beside the portrait as in the design. */}
        <div className="lg:ms-auto lg:w-[44%] xl:w-[38%]">
          <Reveal
            as="h1"
            className="font-display text-ink-900 text-[2.5rem] leading-[1.32] font-bold sm:text-[3rem] lg:text-[3.75rem] xl:text-[4.125rem]"
          >
            <span className="block">{hero.titleLead}</span>
            <span className="block">
              {hero.titleRest.before}
              <span className="text-olive-600">{hero.titleRest.accent}</span>
              {hero.titleRest.after}
            </span>
          </Reveal>

          <Reveal
            as="p"
            delay={120}
            className="text-ink-500 mt-8 max-w-xl text-[0.9375rem] leading-[2.15] lg:mt-9 lg:text-base"
          >
            {hero.description}
          </Reveal>

          <Reveal
            delay={220}
            className="mt-9 flex flex-wrap items-center gap-3.5 lg:mt-10"
          >
            <Button
              href={cta.aboutHref}
              variant="outline"
              size="lg"
              icon={<PlayIcon className="size-full" />}
            >
              {cta.about}
            </Button>
            <Button
              href={cta.bookHref}
              size="lg"
              icon={<CalendarIcon className="size-full" />}
            >
              {cta.book}
            </Button>
          </Reveal>
        </div>

        {/* Trust badges get their own, slightly wider column — as in the
            design — so each caption stays on a single line. */}
        <Reveal delay={320} className="mt-12 lg:ms-auto lg:mt-14 lg:w-[52%] xl:w-[46%]">
          {/* Three across at every width, as in the design — type and spacing
              step down on phones so the labels still fit in a third of 390px. */}
          <ul className="grid grid-cols-3">
            {hero.badges.map((badge, i) => (
              <li
                key={badge.title}
                // `border-s` lands on the right edge in RTL, so the rule sits
                // between this badge and the previous one — as in the design.
                className={cn('px-1 sm:px-2', i > 0 && 'border-line-strong/70 border-s')}
              >
                <div className="flex flex-col items-center gap-1.5 text-center sm:gap-2.5">
                  <Icon
                    name={badge.icon}
                    className="size-[1.35rem] text-olive-700 sm:size-[1.6rem]"
                    strokeWidth={1.4}
                  />
                  <p className="text-ink-900 text-[0.6875rem] leading-tight font-semibold text-balance sm:text-[0.8125rem]">
                    {badge.title}
                  </p>
                  <p className="text-ink-400 text-[0.625rem] leading-snug text-balance sm:text-[0.75rem] sm:leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  )
}
