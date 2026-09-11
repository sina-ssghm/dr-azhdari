import Image from 'next/image'
import { CredentialSlider } from './credential-slider'
import { CredentialTile } from './credential-tile'
import { CredentialViewer, OpenCredentialButton } from './credential-viewer'
import { CalendarIcon, Icon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Ornament } from '@/components/ui/ornament'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeading } from '@/components/ui/section-heading'
import { about, credentials } from '@/content/about'
import { cta } from '@/content/site'

/**
 * «آشنایی با من».
 *
 * A server component from top to bottom. `CredentialViewer` is a client
 * provider, but its children are rendered here and handed to it as a
 * ReactNode, so wrapping the page in it costs these six sections nothing —
 * only the certificate tiles, the strip and the dialog cross into the browser
 * bundle.
 *
 * The measurements are the service pages': the same Container, the same
 * `pt-32 lg:pt-40` clearance under the floating header, the same split hero,
 * the same `py-12 lg:py-16` body rhythm and the same closing band. A visitor
 * arriving from the nav should not feel they have left the site.
 *
 * Headings run h1 → h2 with nothing skipped. The certificates themselves are
 * deliberately not headings: they are buttons, and a heading inside a button
 * is neither valid phrasing content nor any use to somebody navigating by
 * heading, who would land on a title they cannot activate.
 */
export function AboutPage() {
  const { hero, cards, licence, featured, gallery, closing } = about

  return (
    <CredentialViewer>
      {/* `pt-32` clears the floating header, which is fixed and would otherwise
          sit on the name. The value is the service pages', so every inner page
          opens at the same height. */}
      <section className="bg-sand-100 pt-32 pb-10 lg:pt-40 lg:pb-12">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
            <Reveal>
              {/*
                The direction goes on an inline box inside the paragraph, never
                on the paragraph. `dir="ltr"` also sets that element's own
                text-align to left, so on the block it sends the eyebrow to the
                far edge while every line below it stays right — the same trap
                the service hero and the footer's phone numbers both hit. The
                <p> inherits the page's RTL and starts at the right; only the
                letters inside the span are ordered LTR.

                `ink-500` rather than the service hero's `ink-400`: at 12px this
                is small text and needs 4.5:1, which ink-400 on sand-100 misses
                at 3.25. ink-500 is 4.87 and reads as the same quiet grey. It is
                the one number on this page not inherited from an existing one.
              */}
              <p className="text-ink-500 text-[0.75rem] font-medium tracking-[0.24em] uppercase">
                <span dir="ltr" className="inline-block">
                  {hero.eyebrow}
                </span>
              </p>

              <h1 className="font-display text-ink-900 mt-4 text-[2rem] font-bold lg:text-[2.5rem]">
                {hero.title}
              </h1>

              <p className="mt-2 text-[0.9375rem] font-semibold text-olive-700 lg:text-[1rem]">
                {hero.role}
              </p>

              {/* Bold and in the ink colour rather than the olive of the role
                  above it: this is a verifiable fact about her registration,
                  not a second line of the title. */}
              <p className="text-ink-900 mt-2 text-[0.875rem] font-bold lg:text-[0.9375rem]">
                {hero.boardCode}
              </p>

              {/* Set apart with a rule rather than more quotation marks — the
                  copy already carries its own. `border-s` is the logical edge,
                  so the rule sits against the text at the right in Persian
                  rather than stranded on the far side of the column. */}
              <blockquote className="font-display text-ink-900 mt-7 border-s-2 border-olive-400 ps-5 text-[1.0625rem] leading-[2] font-bold lg:text-[1.1875rem]">
                {hero.quote}
              </blockquote>

              <p className="text-ink-500 mt-6 text-[0.9375rem] leading-[2.1]">
                {hero.body}
              </p>
            </Reveal>

            <Reveal>
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)] lg:aspect-[7/6]">
                {/* The one eager image on the page, and the only one above the
                    fold. cover.jpg is 1000×667; at 7/6 `object-cover` keeps
                    about 78% of the width, which leaves the sitter, the desk,
                    the plant and the sculpture all in frame. */}
                <Image
                  src={hero.image.src}
                  alt={hero.image.alt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container>
          {/* Two across only from `md`. Each card is a paragraph, and the
              longer of the two sets to about eight lines at 350px — side by
              side on a phone that is a column of single words. */}
          <ul className="grid gap-5 md:grid-cols-2 lg:gap-6">
            {cards.map((card, i) => (
              <Reveal as="li" key={card.title} delay={i * 90} className="flex">
                <div className="bg-sand-100 flex w-full flex-col rounded-[var(--radius-card)] p-6 sm:p-8">
                  {/* The heading beside it already says what the card is. */}
                  <span
                    aria-hidden="true"
                    className="bg-sand-200 grid size-12 place-items-center rounded-full sm:size-[3.75rem]"
                  >
                    <Icon
                      name={card.icon}
                      strokeWidth={1.3}
                      className="size-6 text-olive-700 sm:size-7"
                    />
                  </span>

                  <h2 className="font-display text-ink-900 mt-5 text-[1.125rem] font-bold lg:text-[1.25rem]">
                    {card.title}
                  </h2>

                  {/* Not justified. Persian justifies by stretching the space
                      between words rather than by kashida in this stack, and at
                      the 310px this column falls to on a phone that opens
                      visible rivers down the paragraph. */}
                  <p className="text-ink-500 mt-4 text-[0.9375rem] leading-[2.1]">
                    {card.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      <section className="bg-sand-100 py-12 lg:py-16">
        <Container>
          {/* The hero's split, at the same ratio and the same gap, so the two
              split sections on this page agree rather than nearly agree. Text
              first in the DOM: it is what a screen reader meets, and on a phone
              it stays above the scan — the words say what the licence is, the
              picture only proves it. */}
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
            <Reveal>
              <h2 className="font-display text-ink-900 text-[1.375rem] leading-[1.7] font-bold sm:text-[1.625rem] lg:text-[1.75rem]">
                {licence.title}
              </h2>

              {/* At the inline start rather than centred: everything in this
                  column is right-aligned, and a flourish floating in the middle
                  of it would be the only thing that is not. */}
              <Ornament className="mt-5" />

              <p className="text-ink-500 mt-5 text-[0.9375rem] leading-[2.1]">
                {licence.body}
              </p>

              <OpenCredentialButton
                id={credentials.licence.id}
                label={licence.action}
                className="mt-8"
              />
            </Reveal>

            {/* The scan opens the same dialog, for a mouse: somebody who wants
                to read a document will reach for the document long before they
                read down to a button. It is `decorative` because the labelled
                button above is the control that exists for the keyboard, and
                hearing the same action announced twice in a row is noise. */}
            <Reveal>
              <CredentialTile doc={credentials.licence} variant="licence" decorative />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* «these are more important … at the end of the page show these 3». */}
      <section className="bg-sand-50 pt-12 lg:pt-16">
        <Container>
          <Reveal>
            <SectionHeading title={featured.title} />
          </Reveal>

          {/*
            One across below `lg`, three from it — and `lg`, not `sm`, on
            purpose. The strip below runs two across all the way to `lg`, so at
            768 a gallery card is 344px; three featured cards at that width
            would be 224px each and the documents the client promoted would
            render *smaller* than the ones they were promoted above. Full width
            below `lg` is what keeps «larger than the slider items» true at
            every viewport rather than only at the two ends.
          */}
          <ul className="mt-9 grid gap-5 lg:grid-cols-3 lg:gap-6">
            {credentials.featured.map((doc, i) => (
              <Reveal as="li" key={doc.id} delay={i * 90} className="flex">
                <CredentialTile doc={doc} variant="featured" />
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      {/* «and then below them show the rest in a slider». No top padding: the
          ground has not changed, so the featured row's own spacing is the gap
          between them. */}
      <section className="bg-sand-50 py-12 lg:py-16">
        <Container>
          <Reveal>
            <SectionHeading title={gallery.title} description={gallery.description} />
          </Reveal>

          <CredentialSlider items={credentials.gallery} />
        </Container>
      </section>

      {/* The homepage's band, at the homepage's width, on the hypnotherapy
          band's ground. A closing strip with nothing to press would be a
          slogan; the booking button is the one the whole site ends on, and its
          wording comes from `cta` rather than being written again here. */}
      <section className="bg-sand-50 pb-20 lg:pb-28">
        <Container className="max-w-[1480px]">
          <Reveal>
            <div className="rounded-[var(--radius-band)] bg-olive-900 px-6 py-12 text-center sm:px-10 lg:py-16">
              <h2 className="font-display text-sand-50 text-[1.5rem] font-bold sm:text-[1.75rem] lg:text-[2rem]">
                {closing.title}
              </h2>

              {/* Ornament ships olive-400, which is 2.79 on this ground and all
                  but gone. olive-200 at 6.48 is the same green the footer and
                  the hypnotherapy band already draw their edges in. */}
              <Ornament className="mx-auto mt-5 text-olive-200" />

              <p className="text-sand-400 mx-auto mt-5 max-w-[34rem] text-[0.9375rem] leading-[2.1]">
                {closing.body}
              </p>

              {/* The hypnotherapy band's button, unchanged, because the finding
                  behind it holds here too: nothing green in the palette clears
                  3:1 against olive-900, so the pill's edge is drawn in olive-200
                  rather than implied, olive-500 is the lightest fill that still
                  carries a white label at 4.98, and the global focus ring —
                  olive-600, 1.78 here — has to go cream or nobody sees it. */}
              <Button
                href={cta.bookHref}
                size="lg"
                className="focus-visible:outline-sand-100 hover:ring-sand-100 mt-8 bg-olive-500 ring-1 ring-olive-200 hover:bg-olive-500"
                icon={<CalendarIcon className="size-full" strokeWidth={1.6} />}
              >
                {cta.book}
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </CredentialViewer>
  )
}
