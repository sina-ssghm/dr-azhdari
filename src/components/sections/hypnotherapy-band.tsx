import { IntroPlayer } from './intro-player'
import { ArrowLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Reveal } from '@/components/ui/reveal'
import { hypnotherapy } from '@/content/site'

/**
 * Hypnotherapy, directly below the services.
 *
 * The dark sibling of the intro band, and the same long strip inverted: the
 * services list names hypnotherapy without room to say what it is, so the
 * short answer sits where the question occurs. Dark ground because this is
 * the one modality most visitors have no picture of, and it has to carry
 * that weight without a section heading the page does not otherwise need.
 */
export function HypnotherapyBand() {
  return (
    // The services above close on 5rem and the testimonials below open on
    // 4rem, so left alone the band would sit a rem nearer to what follows it
    // than to what precedes it. This is that rem — two at `lg`, where the
    // neighbours are 7rem and 5rem.
    <section id="hypnotherapy" className="bg-sand-50 pb-4 lg:pb-8">
      {/* The intro band's width, and for the same reason: two strips of
          different widths with only the services between them would read as
          a mistake rather than as a pair. */}
      <Container className="max-w-[1480px]">
        <Reveal>
          {/* `ps-16` rather than the sibling's `ps-44`: that gutter exists to
              seat the branch, and there is no branch here. The end and
              vertical insets are left alone, so both bands hold their video
              at the same 40/32 from the card edge. */}
          <div className="overflow-hidden rounded-[var(--radius-band)] bg-olive-900 p-6 sm:p-8 lg:py-8 lg:ps-16 lg:pe-10">
            {/*
              Two tracks capped at the same width rather than a plain
              half-and-half. The paragraph sets three lines between roughly
              460px and 604px and only two beyond that, and two lines under
              the heading strand the text in a card whose height the video
              decides. 34rem sits mid-window; past that the surplus falls
              between the halves, where `justify-between` keeps the text on
              the card's start edge and the video on its end edge.
            */}
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,34rem)_minmax(0,34rem)] lg:justify-between lg:gap-12">
              <div>
                <h2 className="font-display text-sand-50 text-[1.375rem] leading-[1.75] font-bold sm:text-[1.5rem] lg:text-[1.75rem]">
                  {hypnotherapy.title}
                </h2>

                <p className="text-sand-400 mt-4 text-justify text-[0.9375rem] leading-[2.1]">
                  {hypnotherapy.body}
                </p>

                {/*
                  Nothing green in the palette clears 3:1 against this band —
                  olive-400 comes closest at 2.79 and cannot carry a label —
                  so the pill's edge is drawn rather than implied: a hairline
                  of olive-200 at 6.48 against the band and 3.13 against the
                  fill. olive-500 is then the lightest fill that still holds a
                  white label at 4.98, which is why the hover deliberately
                  holds it instead of taking the variant's step down to
                  olive-800 — darkening would sink the pill into the band, and
                  every green light enough to read as a change puts the label
                  under 4.5. The hover brightens the hairline instead, and the
                  variant's own lift, glow and icon scale carry the rest. The
                  global focus ring is olive-600, 1.78 here and effectively
                  invisible, so it goes cream.
                */}
                <Button
                  href={hypnotherapy.href}
                  size="md"
                  className="focus-visible:outline-sand-100 hover:ring-sand-100 mt-7 bg-olive-500 ring-1 ring-olive-200 hover:bg-olive-500"
                  icon={
                    <ArrowLeftIcon
                      className="size-full transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover/btn:-translate-x-1"
                      strokeWidth={1.6}
                    />
                  }
                >
                  {hypnotherapy.cta}
                </Button>
              </div>

              {/* Left where it falls on a phone, rather than pulled above the
                  text the way the intro band pulls its own player up. Both
                  players wear the same still, and opening with it a second
                  time asks a visitor to recognise a photograph when the
                  question in the heading is what earns the tap. It also keeps
                  reading order, visual order and focus order the same thing. */}
              <IntroPlayer
                src={hypnotherapy.video.src}
                poster={hypnotherapy.video.poster}
                label={hypnotherapy.video.label}
                play={hypnotherapy.video.play}
                tone="dark"
              />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
