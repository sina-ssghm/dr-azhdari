'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  QuoteIcon,
  SpinnerIcon,
} from '@/components/icons'
import { Flag } from '@/components/ui/flag'
import type { Country } from '@/lib/phone'
import { testimonials } from '@/content/testimonials'
import { cn, toPersianDigits } from '@/lib/utils'

/**
 * The button that opens the comment form, and the wait while it arrives.
 *
 * The dialog is a separate chunk, so on a slow connection there is a real gap
 * between the tap and anything appearing. Rather than leave that silent, the
 * import is awaited here and the button says what it is doing; by the time
 * `open` is set the chunk is in the module cache and the dialog mounts at
 * once. Hovering starts the fetch early, so most clicks never see the wait.
 */
function CommentButton({ onOpen }: { onOpen: () => void }) {
  const [opening, setOpening] = useState(false)

  const warm = () => import('./comment-modal')

  return (
    <button
      type="button"
      onMouseEnter={warm}
      onFocus={warm}
      disabled={opening}
      onClick={async () => {
        setOpening(true)
        try {
          await warm()
          onOpen()
        } finally {
          setOpening(false)
        }
      }}
      className="inline-flex h-[3rem] items-center gap-2 rounded-full border border-olive-600 px-7 text-[0.875rem] font-medium text-olive-700 transition-colors hover:bg-olive-700 hover:text-white disabled:opacity-70"
    >
      {opening ? <SpinnerIcon className="size-4 animate-spin" /> : null}
      {opening ? testimonials.form.opening : testimonials.form.open}
    </button>
  )
}

/**
 * Pulled in only when somebody opens it.
 *
 * The dialog searches a country list derived from a phone-number library;
 * loading that on every homepage view, for a form most visitors will never
 * open, is not a trade worth making.
 */
const CommentModal = dynamic(() =>
  import('./comment-modal').then((module) => module.CommentModal)
)

/** One approved comment, with its country already resolved server-side. */
export type Slide = {
  name?: string
  service?: string
  quote: string
  country: Country | undefined
}

/** How long a quote holds before the strip advances on its own. */
const AUTOPLAY_MS = 4000

/**
 * Three copies of the list, so there is always one to scroll onto.
 *
 * The strip starts in the middle copy; once a scroll settles outside it, the
 * equivalent slide in the middle copy is jumped to without animation. The two
 * are identical and identically placed relative to their neighbours, so the
 * seam is invisible and the carousel loops for ever in both directions.
 */
const COPIES = 3

/** How far a drag must travel, as a share of the track, to commit to a move. */
const COMMIT = 0.12

/**
 * One testimonial at a time, with its neighbours peeking in at either side.
 *
 * Built on CSS scroll-snap rather than a carousel library: the swipe, the
 * momentum and the snapping are the browser's own, which behaves far better on
 * a phone than anything reimplemented in JavaScript, and it degrades to a
 * scrollable, readable strip with no script at all.
 *
 * Every movement shifts the track by a measured delta, never `scrollIntoView`
 * — see `scrollTo` for why that mattered. A relative shift is also correct
 * whichever way the browser counts RTL `scrollLeft`, which is the ambiguity
 * the loop's silent rebase would otherwise have to reason about.
 */
export function TestimonialsSlider({
  slides,
  anonymous,
}: {
  slides: Slide[]
  /** Stands in for a name while the comments carry no attribution. */
  anonymous: string
}) {
  if (slides.length === 0) return <EmptyState anonymous={anonymous} />
  return <Carousel slides={slides} anonymous={anonymous} />
}

function Carousel({ slides, anonymous }: { slides: Slide[]; anonymous: string }) {
  const count = slides.length
  const trackRef = useRef<HTMLUListElement>(null)
  const slideRefs = useRef<(HTMLLIElement | null)[]>([])

  /** Index into the tripled list. `raw % count` is the quote being shown. */
  const [raw, setRaw] = useState(count)
  /**
   * The same value, readable synchronously.
   *
   * Several things need it before React has re-rendered: consecutive taps on
   * the arrows, which must chain rather than both computing from the same
   * stale base; the rebase, which fires from a scroll listener long after the
   * render that scheduled it; and the drag, which reads it on every frame.
   */
  const rawRef = useRef(count)
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const [commenting, setCommenting] = useState(false)
  const [onScreen, setOnScreen] = useState(false)

  const looped = Array.from({ length: COPIES }, () => slides).flat()
  const active = ((raw % count) + count) % count

  /**
   * Centres a slide by scrolling the strip, and only the strip.
   *
   * This used `scrollIntoView` with `block: 'nearest'`, on the understanding
   * that "nearest" meant "do not scroll vertically". It does not: when the
   * element is outside the viewport it still scrolls every ancestor, the
   * document included. So opening the homepage — where the strip positions
   * itself on mount, far below the fold — dragged the whole page down to the
   * testimonials.
   *
   * Scrolling the track by a measured delta instead cannot move the page. It
   * also sidesteps the reason `scrollIntoView` was chosen originally: RTL
   * `scrollLeft` counts negative from the right in current browsers and
   * positive in older ones, but a *relative* shift is correct under either.
   */
  const dragRef = useRef<{
    id: number
    startX: number
    fromScroll: number
    fromIndex: number
    limit: number
    moved: number
  } | null>(null)

  /** Cleared when a programmatic scroll finishes and snapping comes back. */
  const restoreSnap = useRef<number | undefined>(undefined)

  const scrollTo = useCallback((index: number, smooth: boolean) => {
    const track = trackRef.current
    const slide = slideRefs.current[index]
    if (!track || !slide) return

    const trackBox = track.getBoundingClientRect()
    const slideBox = slide.getBoundingClientRect()
    const delta =
      slideBox.left + slideBox.width / 2 - (trackBox.left + trackBox.width / 2)

    // Sub-pixel deltas are the rounding of an already-centred slide; acting on
    // them would restart a smooth scroll that had just finished.
    if (Math.abs(delta) < 1) return

    // Snapping is suspended for the duration. `scroll-snap-stop: always` is
    // there to stop a reader's flick skipping cards, but it governs
    // programmatic scrolls too: asked to jump ten slides the browser stopped
    // at the first snap point, so the strip opened on the wrong card and every
    // arrow press overshot. It comes back as soon as the scroll is done, which
    // is what holds the card in place.
    window.clearTimeout(restoreSnap.current)
    track.style.scrollSnapType = 'none'
    // Force the style through before scrolling, or the two are batched and the
    // suspension never takes effect.
    void track.offsetWidth

    track.scrollBy({ left: delta, behavior: smooth ? 'smooth' : 'auto' })

    const restore = () => {
      // Never mid-drag: the drag owns the property while a finger is down.
      if (!dragRef.current) track.style.scrollSnapType = ''
    }
    if (smooth) {
      restoreSnap.current = window.setTimeout(restore, 700)
    } else {
      restore()
    }
  }, [])

  /**
   * Which slide is centred, measured rather than observed.
   *
   * This was an IntersectionObserver, and it was wrong: the callback only
   * receives the slides that crossed a threshold, so a card merely passing
   * through the middle during a scroll could win the batch and be highlighted
   * while a different one came to rest in the centre. Comparing every slide's
   * centre against the track's cannot pick a card that is not actually there.
   */
  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const middleOfTrack = track.getBoundingClientRect().left + track.clientWidth / 2

    let nearest = -1
    let shortest = Infinity
    slideRefs.current.forEach((slide, index) => {
      if (!slide) return
      const box = slide.getBoundingClientRect()
      const distance = Math.abs(box.left + box.width / 2 - middleOfTrack)
      if (distance < shortest) {
        shortest = distance
        nearest = index
      }
    })

    if (nearest >= 0 && nearest !== rawRef.current) {
      rawRef.current = nearest
      setRaw(nearest)
    }
  }, [])

  // Start in the middle copy, before paint, so the loop has room behind it.
  useEffect(() => {
    scrollTo(count, false)
    rawRef.current = count
    setRaw(count)
    setReady(true)
  }, [count, scrollTo])

  /** Folds any index back into the middle copy. */
  const middle = useCallback(
    (index: number) => (((index % count) + count) % count) + count,
    [count]
  )

  const [dragging, setDragging] = useState(false)

  /**
   * Track the centred card while scrolling, and rebase once it stops.
   *
   * The rebase reads the current index when it fires rather than closing over
   * the one that scheduled it: an earlier version registered a one-shot
   * listener per index change, and a leftover from the previous slide fired at
   * the end of the *next* navigation and yanked it back, so the loop went
   * forwards once and then stuck.
   */
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }

    const rebase = () => {
      // Not mid-gesture: jumping under the reader's own finger is worse than
      // waiting a moment for them to let go.
      if (dragRef.current) return
      const current = rawRef.current
      if (current >= count && current < count * 2) return
      const destination = middle(current)
      rawRef.current = destination
      setRaw(destination)
      scrollTo(destination, false)
    }

    track.addEventListener('scroll', onScroll, { passive: true })

    const hasScrollEnd = 'onscrollend' in window
    if (hasScrollEnd) {
      track.addEventListener('scrollend', rebase)
      return () => {
        track.removeEventListener('scroll', onScroll)
        track.removeEventListener('scrollend', rebase)
        window.cancelAnimationFrame(frame)
      }
    }

    // Safari has no scrollend; wait out the momentum instead.
    let settle: number | undefined
    const onScrollSettle = () => {
      window.clearTimeout(settle)
      settle = window.setTimeout(rebase, 180)
    }
    track.addEventListener('scroll', onScrollSettle, { passive: true })
    return () => {
      track.removeEventListener('scroll', onScroll)
      track.removeEventListener('scroll', onScrollSettle)
      window.clearTimeout(settle)
      window.cancelAnimationFrame(frame)
    }
  }, [count, middle, measure, scrollTo])

  const goTo = useCallback(
    (index: number) => {
      let next = index
      // Only reachable by out-tapping the rebase; fold back before scrolling
      // so the index always addresses a slide that exists.
      if (next < 0 || next >= count * COPIES) next = middle(next)
      rawRef.current = next
      // Set at once, so the dots answer the tap and a second tap steps on from
      // this one rather than repeating it.
      setRaw(next)
      scrollTo(next, true)
    },
    [count, middle, scrollTo]
  )

  const go = useCallback((delta: number) => goTo(rawRef.current + delta), [goTo])

  /** Jumps to a quote by its dot, taking the shortest hop from where we are. */
  const goToIndex = useCallback(
    (index: number) => goTo(Math.floor(rawRef.current / count) * count + index),
    [goTo, count]
  )

  /* ------------------------------- dragging ------------------------------- */

  /**
   * Drag-to-swipe, for pointers that do not scroll on their own.
   *
   * A touch already scrolls the strip natively, with momentum the browser
   * tunes per platform, so fingers are left alone. A mouse does nothing when
   * you drag a scroll container, which on a desktop makes the carousel look
   * broken: you grab a card, pull, and it sits there.
   *
   * The drag is capped at one card's width. Without the cap a long pull
   * scrolled several cards past and the release then stepped one further
   * again — three cards from one gesture. Capping it means what you see under
   * the cursor is exactly what you get when you let go.
   */
  const onPointerDown = (event: React.PointerEvent<HTMLUListElement>) => {
    if (event.pointerType === 'touch' || event.button !== 0) return
    const track = trackRef.current
    const slide = slideRefs.current[rawRef.current]
    if (!track || !slide) return

    dragRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      fromScroll: track.scrollLeft,
      fromIndex: rawRef.current,
      limit: slide.offsetWidth,
      moved: 0,
    }
    setDragging(true)
    setPaused(true)
    // Snapping fights a scroll position being set by hand. It comes back on
    // release, and settling the card into place is exactly its job.
    track.style.scrollSnapType = 'none'
    track.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLUListElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag || !track || event.pointerId !== drag.id) return
    const dx = event.clientX - drag.startX
    drag.moved = Math.max(-drag.limit, Math.min(drag.limit, dx))
    track.scrollLeft = drag.fromScroll - drag.moved
  }

  const endDrag = (event: React.PointerEvent<HTMLUListElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag || !track || event.pointerId !== drag.id) return

    dragRef.current = null
    setDragging(false)
    setPaused(false)
    track.style.scrollSnapType = ''
    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId)
    }

    // Measured from where the drag *started*, never from wherever the strip
    // has scrolled to — that double-count was the three-card jump.
    if (Math.abs(drag.moved) < track.clientWidth * COMMIT) {
      goTo(drag.fromIndex)
      return
    }
    // Pulling a card to the right uncovers what lies to its left, and in RTL
    // that is the next one.
    goTo(drag.fromIndex + (drag.moved > 0 ? 1 : -1))
  }

  /**
   * Horizontal wheel and trackpad gestures, taken over deliberately.
   *
   * `scroll-snap-stop: always` is set on every slide and does stop a fling at
   * the next card — but only within one scroll operation. A two-finger swipe
   * emits a burst of separate wheel events, each nudging the strip along, and
   * they accumulate three or four cards before the snap ever resolves. So the
   * gesture is intercepted instead: the first event of a burst steps exactly
   * one card and the rest are swallowed until the fingers stop.
   *
   * Attached by hand rather than through `onWheel` because React registers
   * that listener as passive, where `preventDefault` is ignored. Vertical
   * intent is left untouched, so the page still scrolls over the slider.
   */
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let locked = false
    let quiet: number | undefined

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()

      window.clearTimeout(quiet)
      quiet = window.setTimeout(() => {
        locked = false
      }, 260)

      if (locked) return
      locked = true
      // Scrolling right moves toward earlier cards in an RTL strip.
      go(event.deltaX < 0 ? 1 : -1)
    }

    track.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      track.removeEventListener('wheel', onWheel)
      window.clearTimeout(quiet)
    }
  }, [go])

  /* ------------------------------- autoplay ------------------------------- */

  // Only run it when it is worth running: on screen, not hovered, focused or
  // being dragged, tab in the foreground, and never when motion is unwelcome.
  useEffect(() => {
    if (!ready || paused || commenting || !onScreen) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') go(1)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [ready, paused, commenting, onScreen, go])

  // Nothing should be advancing in a section nobody is looking at.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(Boolean(entry?.isIntersecting)),
      { threshold: 0.3 }
    )
    observer.observe(track)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      role="group"
      aria-roledescription="اسلایدر"
      aria-label="تجربه مراجعان"
      className="mt-10"
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // A swipe is a statement of intent; do not yank the strip out from under it.
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
    >
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label="نظرات مراجعان"
        aria-live="off"
        onKeyDown={(event) => {
          // In RTL the next slide lies to the left, so the arrows mean the
          // opposite of what they would in a Latin layout.
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            go(1)
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            go(-1)
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'flex snap-x snap-mandatory scrollbar-none overflow-x-auto py-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive-400',
          // Selecting text would otherwise fight the drag on every card.
          dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        )}
      >
        {looped.map((item, i) => {
          const isCentre = i === raw
          return (
            <li
              key={i}
              ref={(el) => {
                slideRefs.current[i] = el
              }}
              role="group"
              aria-roledescription="اسلاید"
              aria-label={`${toPersianDigits((i % count) + 1)} از ${toPersianDigits(count)}`}
              aria-hidden={i < count || i >= count * 2 ? true : undefined}
              onDragStart={(event) => event.preventDefault()}
              // `snap-always` is what stops a flick from skipping past several
              // cards: the scroll is required to come to rest on the very next
              // snap point rather than wherever its momentum runs out.
              className="w-[86%] shrink-0 snap-center snap-always px-2 sm:w-[68%] lg:w-[52%]"
            >
              <figure
                className={cn(
                  'mx-auto flex h-full flex-col justify-center rounded-[var(--radius-card)] bg-white p-6 text-center transition-all duration-500 sm:p-7 lg:p-8',
                  // The peeked neighbours recede, so the eye is never in doubt
                  // about which quote it is meant to be reading.
                  isCentre
                    ? 'opacity-100 shadow-[var(--shadow-lift)]'
                    : 'scale-[0.94] opacity-45'
                )}
              >
                <QuoteIcon className="mx-auto size-6 text-olive-200" />

                <blockquote className="text-ink-700 mt-3 text-[0.8125rem] leading-[2.1] sm:text-[0.875rem]">
                  {item.quote}
                </blockquote>

                <figcaption className="text-ink-400 mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[0.75rem]">
                  {item.name ? (
                    <span className="text-ink-900 font-semibold">{item.name}</span>
                  ) : (
                    <span>{anonymous}</span>
                  )}

                  {item.country ? (
                    <span className="flex items-center gap-1.5">
                      <Flag
                        country={item.country}
                        className="h-[0.7rem] w-4"
                        decorative
                      />
                      {item.country.name}
                    </span>
                  ) : null}

                  {item.service ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{item.service}</span>
                    </>
                  ) : null}
                </figcaption>
              </figure>
            </li>
          )
        })}
      </ul>

      <div className="mt-6 flex items-center justify-center gap-4">
        {/* Previous sits at the inline start — the right-hand side in RTL. */}
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="نظر قبلی"
          className="text-ink-500 border-line grid size-10 shrink-0 place-items-center rounded-full border bg-white transition-colors hover:border-olive-400 hover:text-olive-700"
        >
          <ChevronRightIcon className="size-4" />
        </button>

        <ul className="flex items-center gap-2">
          {slides.map((_, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => goToIndex(i)}
                aria-label={`نظر ${toPersianDigits(i + 1)}`}
                aria-current={i === active ? 'true' : undefined}
                className={cn(
                  'block h-2 rounded-full transition-all duration-300',
                  i === active
                    ? 'w-6 bg-olive-700'
                    : 'bg-sand-300 hover:bg-ink-400/50 w-2'
                )}
              />
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="نظر بعدی"
          className="text-ink-500 border-line grid size-10 shrink-0 place-items-center rounded-full border bg-white transition-colors hover:border-olive-400 hover:text-olive-700"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
      </div>

      <div className="mt-8 text-center">
        <CommentButton onOpen={() => setCommenting(true)} />
      </div>

      {commenting ? <CommentModal onClose={() => setCommenting(false)} /> : null}
    </div>
  )
}

/**
 * The section before anybody has written anything, or with every comment still
 * unapproved. Keeps the invitation, drops the machinery — none of the loop's
 * arithmetic survives a division by zero.
 */
function EmptyState({ anonymous }: { anonymous: string }) {
  const [commenting, setCommenting] = useState(false)
  void anonymous

  return (
    <div className="mt-10 text-center">
      <p className="text-ink-400 border-line rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-[0.875rem]">
        {testimonials.empty}
      </p>
      <div className="mt-8">
        <CommentButton onOpen={() => setCommenting(true)} />
      </div>
      {commenting ? <CommentModal onClose={() => setCommenting(false)} /> : null}
    </div>
  )
}
