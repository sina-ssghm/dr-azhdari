import { IntroPlayer } from './intro-player'
import { ArrowLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Reveal } from '@/components/ui/reveal'
import { intro } from '@/content/site'

/** Where a leaf sits on the stem, how long it is, and which way it points. */
const LEAVES = [
  { x: 136, y: 214, length: 46, angle: -28 },
  { x: 125, y: 182, length: 52, angle: 208 },
  { x: 115, y: 150, length: 48, angle: -22 },
  { x: 107, y: 118, length: 44, angle: 214 },
  { x: 102, y: 86, length: 38, angle: -18 },
  { x: 99, y: 56, length: 32, angle: 218 },
] as const

/**
 * A leafy branch, set into the outer margin of the band.
 *
 * Decorative and behind the content. Each leaf is one almond outline with a
 * midrib, drawn along +x and rotated onto the stem, which keeps every shape
 * identical and the arithmetic out of the path data.
 */
function Branch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 260"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M150 252C106 200 92 134 100 14" />

      {LEAVES.map(({ x, y, length, angle }) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${angle})`}>
          <path
            d={`M0 0Q${length * 0.42} ${-length * 0.34} ${length} 0Q${length * 0.42} ${length * 0.34} 0 0Z`}
          />
          <path d={`M0 0L${length * 0.86} 0`} strokeWidth={0.9} />
        </g>
      ))}
    </svg>
  )
}

/**
 * The introduction, above the services.
 *
 * A short piece to camera behind a still, so somebody deciding whether to book
 * meets a person before they meet a list of services.
 */
export function IntroVideo() {
  return (
    <section id="intro" className="bg-sand-50 pt-10 lg:pt-14">
      {/* Wider than the site's usual rhythm: the band is one long horizontal
          card, and at the standard width it read as tall and cramped rather
          than as the strip it is meant to be. */}
      <Container className="max-w-[1480px]">
        <Reveal>
          <div className="bg-sand-100 relative overflow-hidden rounded-[var(--radius-band)] p-6 sm:p-8 lg:py-8 lg:ps-44 lg:pe-10">
            {/*
              `start`, so it sits in the outer margin of the reading direction —
              the right-hand edge here. Coloured with a token that exists: this
              was `olive-300`, which is not in the palette, so Tailwind emitted
              nothing and the branch inherited whatever colour it found.
            */}
            <Branch className="text-sand-500 pointer-events-none absolute -start-2 top-1/2 hidden h-[15rem] w-auto -translate-y-1/2 lg:block" />

            <div className="relative grid items-center gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
              {/* Text first in the DOM: it is what a screen reader should meet,
                  and on a phone the video is pulled above it by `order`. */}
              <div>
                {/*
                  Sized from the viewport so the greeting holds one line on a
                  phone. At 320px there are only 232px between the card's
                  padding and the page's, and the title needs 313px at 1.5rem —
                  no fixed size fits both a small phone and a large one. The
                  slope is measured from the rendered font (~13px of width per
                  1px of size) with headroom, and it is deliberately not
                  `whitespace-nowrap`: if a device's metrics differ, wrapping is
                  a far better failure than spilling out of the card.
                */}
                <h2 className="font-display text-ink-900 text-[clamp(1rem,calc(7.2vw-6.4px),1.5rem)] leading-[1.75] font-bold lg:text-[1.75rem]">
                  {intro.title}
                </h2>

                <p className="text-ink-500 mt-4 text-justify text-[0.9375rem] leading-[2.1]">
                  {intro.body}
                </p>

                <Button
                  href="/about"
                  variant="outline"
                  size="md"
                  className="mt-7"
                  icon={
                    <ArrowLeftIcon
                      className="size-full transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover/btn:-translate-x-1"
                      strokeWidth={1.6}
                    />
                  }
                >
                  {intro.cta}
                </Button>
              </div>

              {/* Stacked above the text on a phone — the face is the hook. On a
                  wide screen the grid puts it in the second column, which in
                  RTL is the left-hand side. */}
              <div className="order-first lg:order-none">
                <IntroPlayer
                  src={intro.video.src}
                  poster={intro.video.poster}
                  label={intro.video.label}
                  play={intro.video.play}
                />
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
