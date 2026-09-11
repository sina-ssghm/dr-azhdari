import Image from 'next/image'
import { IntroPlayer } from './intro-player'
import { CalendarIcon, Icon, InfoIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Ornament } from '@/components/ui/ornament'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeading } from '@/components/ui/section-heading'
import type { ServiceDetail } from '@/content/service-detail'
import { cn } from '@/lib/utils'
import { cta as siteCta } from '@/content/site'

/**
 * The full page behind a service card.
 *
 * Built from the homepage's own measurements rather than new ones — the same
 * Container, the same `py-20 lg:py-28` section rhythm, the same card and band
 * treatments — so a visitor arriving here from a service card does not feel
 * they have left the site.
 */
export function ServiceDetailPage({
  title,
  detail,
}: {
  title: string
  detail: ServiceDetail
}) {
  /* Written out in full rather than interpolated: Tailwind scans source text,
     and a class it never sees as a literal is a class it never emits. */
  const { note } = detail

  const columns = detail.topicColumns ?? (detail.topics.length >= 6 ? 6 : 5)
  const topicColumns =
    columns === 3 ? 'lg:grid-cols-3' : columns === 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-5'

  return (
    <>
      {/* `pt-36` clears the floating header, which is fixed and would otherwise
          sit on top of the title. The value is the holding page's, so every
          service page opens at the same height whether or not it has copy. */}
      <section className="bg-sand-100 pt-32 pb-10 lg:pt-40 lg:pb-12">
        {detail.heroImage ? (
          /* Split opening: the copy on the inline start, a photograph beside
             it. Nothing is centred, so the lead and body set to the column
             rather than to a measure of their own. */
          <Container>
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
              <Reveal>
                {detail.eyebrow ? (
                  /* The direction goes on an inline box inside the paragraph,
                     not on the paragraph. `dir="ltr"` also sets that element's
                     own text-align to left, so putting it on the block sent
                     the eyebrow to the far edge while every line below it
                     stayed right — the same trap the footer's phone numbers
                     hit. The <p> inherits the page's RTL and starts at the
                     right; only the letters inside the span are ordered LTR. */
                  <p className="text-ink-400 text-[0.75rem] font-medium tracking-[0.24em] uppercase">
                    <span dir="ltr" className="inline-block">
                      {detail.eyebrow}
                    </span>
                  </p>
                ) : null}

                <h1 className="font-display text-ink-900 mt-4 text-[2rem] font-bold lg:text-[2.5rem]">
                  {title}
                </h1>

                {/* At the inline start rather than centred: everything in this
                    column is right-aligned, and a flourish floating in the
                    middle of it would be the only thing that is not. */}
                {detail.heroOrnament ? <Ornament className="mt-5" /> : null}

                {detail.lead ? (
                  <p className="font-display text-ink-900 mt-5 text-[1.25rem] leading-[1.75] font-bold lg:text-[1.5rem]">
                    {detail.lead}
                  </p>
                ) : null}

                <p className="text-ink-500 mt-5 text-[0.9375rem] leading-[2.1]">
                  {detail.body}
                </p>

                {detail.heroCtaLabel ? (
                  <Button
                    href={siteCta.bookHref}
                    size="lg"
                    className="mt-8"
                    icon={<CalendarIcon className="size-full" strokeWidth={1.6} />}
                  >
                    {detail.heroCtaLabel}
                  </Button>
                ) : null}
              </Reveal>

              <Reveal>
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)] lg:aspect-[7/6]">
                  <Image
                    src={detail.heroImage.src}
                    alt={detail.heroImage.alt}
                    fill
                    priority
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="object-cover"
                  />
                </div>
              </Reveal>
            </div>
          </Container>
        ) : (
          <Container className="flex flex-col items-center text-center">
            <Reveal className="flex flex-col items-center">
              <h1 className="font-display text-ink-900 text-[2rem] font-bold lg:text-[2.5rem]">
                {title}
              </h1>

              <Ornament className="mt-4" />

              {detail.lead ? (
                <p className="font-display text-ink-900 mt-6 max-w-[36rem] text-[1.0625rem] leading-[1.9] font-bold lg:text-[1.1875rem]">
                  {detail.lead}
                </p>
              ) : null}

              <p className="text-ink-500 mt-5 max-w-[40rem] text-[0.9375rem] leading-[2.1]">
                {detail.body}
              </p>
            </Reveal>

            {/* Capped well inside the container: at the full 1280 the player
                would tower over the paragraph that introduces it, and the clip
                is a talking head rather than something worth filling a screen
                with. */}
            {detail.video ? (
              <Reveal className="mt-8 w-full max-w-[46rem] lg:mt-10">
                <IntroPlayer
                  src={detail.video.src}
                  poster={detail.video.poster}
                  label={detail.video.label}
                  play={detail.video.play}
                />
              </Reveal>
            ) : null}
          </Container>
        )}
      </section>

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container>
          <Reveal>
            <SectionHeading title={detail.topicsTitle} />
          </Reveal>

          {/*
            Two across on a phone rather than the services grid's three: these
            titles run to «تصمیم‌گیری‌های مهم زندگی» and each card keeps its
            description, which three columns cannot hold at 390px. Five across
            only at `lg`, where the row matches the design.
          */}
          <ul
            className={cn(
              'mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4',
              topicColumns
            )}
          >
            {detail.topics.map((topic, i) => (
              <Reveal as="li" key={topic.title} delay={i * 90} className="flex">
                <div className="bg-sand-100 flex w-full flex-col items-center rounded-[var(--radius-card)] p-4 text-center sm:p-6">
                  <span className="bg-sand-200 grid size-12 place-items-center rounded-full sm:size-[3.75rem]">
                    <Icon
                      name={topic.icon}
                      strokeWidth={1.3}
                      className="text-ink-700 size-6 sm:size-7"
                    />
                  </span>

                  <h3 className="text-ink-900 mt-4 text-[0.8125rem] leading-snug font-semibold sm:mt-5 sm:text-[0.9375rem]">
                    {topic.title}
                  </h3>

                  {topic.description ? (
                    <p className="text-ink-500 mt-2.5 text-[0.75rem] leading-[1.9] sm:mt-3 sm:text-[0.8125rem]">
                      {topic.description}
                    </p>
                  ) : null}
                </div>
              </Reveal>
            ))}
          </ul>

          {note ? (
            /*
              A grid rather than a row, because the two layouts differ in more
              than spacing. On a phone the label and the glyph share the top
              line and the paragraph runs the full width beneath them — beside a
              48px disc it was setting to about 250px, and Persian at that
              measure breaks badly. From `sm` the glyph spans both rows at the
              inline end (the left in RTL, as in the design) and the paragraph
              keeps the first column.

              `aria-hidden` on the glyph because the label beside it already
              says what the box is.
            */
            <Reveal>
              <div className="border-line bg-sand-100 mt-5 grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-3 rounded-[var(--radius-card)] border p-5 sm:mt-6 sm:gap-x-7 sm:p-6">
                <p className="text-ink-900 text-[0.9375rem] font-semibold">
                  {note.label}
                </p>

                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-full border border-olive-200 text-olive-700 sm:row-span-2 sm:size-14"
                >
                  <InfoIcon className="size-6 sm:size-7" strokeWidth={1.3} />
                </span>

                <p className="text-ink-500 col-span-2 text-justify text-[0.875rem] leading-[2.1] sm:col-span-1">
                  {note.body}
                </p>
              </div>
            </Reveal>
          ) : null}
        </Container>
      </section>

      {/* The homepage's band, at the homepage's width. */}
      <section className="bg-sand-50 pb-12 lg:pb-16">
        <Container className="max-w-[1480px]">
          <Reveal>
            <div className="bg-sand-100 overflow-hidden rounded-[var(--radius-band)]">
              <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
                {/* Text first in the DOM so it is what a screen reader meets,
                    and on a phone it stays above the photograph — the words
                    are the reason to press the button, the picture is not. */}
                <div className="p-7 pb-0 lg:py-10 lg:ps-10 lg:pe-0">
                  <h2 className="font-display text-ink-900 text-[1.375rem] leading-[1.7] font-bold sm:text-[1.625rem] lg:text-[1.75rem]">
                    {detail.cta.title}
                  </h2>

                  {detail.cta.ornament ? <Ornament className="mt-5" /> : null}

                  <p className="text-ink-500 mt-4 text-[0.9375rem] leading-[2.1]">
                    {detail.cta.body}
                  </p>

                  {detail.cta.chips ? (
                    /* Not links and not buttons — they name the modalities the
                       copy just referred to, so a plain list is what they are.
                       `sand-50` on `sand-100` is the only pairing in the
                       palette that reads as raised on this ground.

                       `dir="ltr"` on the row, not the pills: they are Latin
                       names read as a sequence, so CBT leads at the left as
                       in the design, while `justify-end` keeps the row itself
                       against the right edge the copy above it sets. */
                    <ul dir="ltr" className="mt-6 flex flex-wrap justify-end gap-2.5">
                      {detail.cta.chips.map((chip) => (
                        <li
                          key={chip}
                          className="border-line bg-sand-50 text-ink-700 rounded-full border px-4 py-2 text-[0.8125rem]"
                        >
                          {chip}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Button
                      href={siteCta.bookHref}
                      size="lg"
                      icon={<CalendarIcon className="size-full" strokeWidth={1.6} />}
                    >
                      {detail.cta.label}
                    </Button>

                    {detail.cta.secondary ? (
                      <Button
                        href={detail.cta.secondary.href}
                        variant="outline"
                        size="lg"
                        icon={
                          <Icon
                            name={detail.cta.secondary.icon}
                            className="size-full"
                            strokeWidth={1.6}
                          />
                        }
                      >
                        {detail.cta.secondary.label}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* `h-full object-cover` so the photograph fills its half of a
                    band whose height the text decides, instead of leaving a
                    strip of card above and below it at wide sizes. */}
                <div className="relative h-52 sm:h-64 lg:h-full lg:min-h-[19rem]">
                  <Image
                    src={detail.cta.image.src}
                    alt={detail.cta.image.alt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />

                  {/* The homepage booking band's dissolve, in this band's
                      colour: sand-100 rather than sand-200. The photograph
                      sits at the physical left in RTL, so the gradient runs
                      left-to-right and lands on the band exactly at the edge
                      the photo would otherwise cut against.

                      Desktop only. Stacked, the photo is a full-width banner
                      with nothing beside it, and a fade there would just look
                      like one end of the picture had been washed out. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 hidden bg-[linear-gradient(to_right,transparent_38%,rgb(247_245_240/0.5)_72%,rgb(247_245_240/0.92)_92%,var(--color-sand-100)_100%)] lg:block"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  )
}
