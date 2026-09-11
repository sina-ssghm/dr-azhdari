'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CredentialTile } from './credential-tile'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { about, type Credential } from '@/content/about'
import { toPersianDigits } from '@/lib/utils'

/*
  Four across on a desktop, two on a phone — the client's instruction, and the
  reason the gutters are padding inside each card rather than `gap` on the
  track.

  That is the whole guarantee, and it is arithmetic rather than tuning.
  Preflight sets `box-sizing: border-box`, so `w-1/4` is a quarter of the
  track's *content box* with the card's own `px` already inside it: four of
  them come to exactly 100% of what is visible and a fifth cannot appear. Put
  the gutter in a `gap-4` instead and four cards plus three 16px gaps overflow
  the track by 48px, so the fourth is pushed out and the row shows three and a
  sliver.

  Two things must therefore never be added to this track: horizontal padding,
  which shrinks the content box below the scrollport and leaves an inset strip
  for the neighbours to show through, and a negative inline margin for shadow
  bleed, which widens it past the container so a fifth card peeks in at the
  edge. Either one breaks the count the client asked for while still looking
  almost right, which is why it is written down here.
*/
const track =
  'scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-2'

const arrow =
  'text-ink-500 border-line grid size-10 shrink-0 place-items-center rounded-full ' +
  'border bg-white transition-colors hover:border-olive-400 hover:text-olive-700 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-40'

/**
 * The rest of the certificates: four at a time on a desktop, two on a phone.
 *
 * Scroll-snap, like the testimonials strip, and for the reason that file
 * gives — the swipe, the momentum and the settling are the browser's own, they
 * behave far better on a phone than anything reimplemented here, and with no
 * script at all this degrades to a scrollable, readable row of documents.
 *
 * Nothing else from that file is here, because this is a different object.
 * There is no triple-copied loop: that machinery exists so a single centred
 * quote always has neighbours to scroll onto, and it works by hiding two of
 * its three copies from the accessibility tree — which cannot be done at all
 * when every card is a focusable button. There is no autoplay, because a quote
 * that rotates past you comes round again whereas a document sliding out from
 * under someone reading it is a fault; that also removes the visibility check,
 * the pause-on-hover/focus/pointer matrix and the observer behind them. There
 * is no drag-to-swipe and no wheel interception, both of which exist there to
 * make a one-card strip feel like a carousel and both of which are where its
 * recorded bugs came from. And there is no `snap-always`, which is precisely
 * what forced that file to suspend snapping around every programmatic scroll:
 * without it, a four-card jump is one uninterrupted scroll that lands where it
 * was aimed.
 *
 * What is kept is the hard-won part: every move is a measured, relative
 * `scrollBy`, never `scrollIntoView` and never a position. That method scrolls
 * every ancestor including the document whenever the target is out of view,
 * which is how the homepage used to drag itself down to the testimonials on
 * load; and browsers have disagreed about which way RTL `scrollLeft` counts,
 * while a delta is right under either reading.
 */
export function CredentialSlider({ items }: { items: readonly Credential[] }) {
  const copy = about.gallery
  const trackRef = useRef<HTMLUListElement>(null)

  /**
   * Whether the strip is resting against each end, which is all the arrows
   * need to know.
   *
   * `end: false` at first render rather than `true`: ten certificates never
   * fit one view at either count, so the server's markup is already correct
   * and nothing changes under the visitor when the measurement arrives. This
   * is also why there is no page counter and no row of dots — both would have
   * to render a made-up number on the server and correct it after hydration,
   * and the dots would change *count* as they did it.
   */
  const [edges, setEdges] = useState({ start: true, end: false })

  /**
   * Which end, if either, the strip is resting against.
   *
   * Read off the cards' own rectangles: the leading edge is the right one here
   * and the left one in a Latin layout, and comparing rectangles is true in
   * both without this file branching on writing direction anywhere.
   */
  const measure = useCallback(() => {
    const strip = trackRef.current
    if (!strip) return

    const cards = strip.children
    const first = cards[0]?.getBoundingClientRect()
    const last = cards[cards.length - 1]?.getBoundingClientRect()
    if (!first || !last) return

    const box = strip.getBoundingClientRect()
    const rtl = first.left > last.left
    const behind = rtl ? box.right - first.right : first.left - box.left
    const ahead = rtl ? last.left - box.left : box.right - last.right

    // Two pixels of slack: at a container width that does not divide by four
    // the card is a fractional size and the browser rounds the scroll extent.
    setEdges({ start: behind >= -2, end: ahead >= -2 })
  }, [])

  const page = useCallback((direction: 1 | -1) => {
    const strip = trackRef.current
    if (!strip) return

    const first = strip.children[0]?.getBoundingClientRect()
    const second = strip.children[1]?.getBoundingClientRect()
    if (!first || !second) return

    /* One card's worth of scroll, with the direction already in the sign:
       negative on this RTL page, positive in a Latin one. Scrolling by a
       multiple of it moves forward without this file ever asking which way the
       page runs. */
    const stride = second.left - first.left
    if (stride === 0) return

    /* How many fit is asked of the layout rather than restated here. The card
       is `w-1/2 lg:w-1/4` of the track, so this answers exactly two or exactly
       four, and there is no second copy of the breakpoint in JavaScript to
       fall out of step with the CSS that actually decides it. */
    const perView = Math.max(1, Math.round(strip.clientWidth / Math.abs(stride)))

    /* Past the last page the browser clamps this, which is exactly right: the
       final view is the last four cards flush against the end, not four cards
       and a gap. */
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    strip.scrollBy({
      left: stride * perView * direction,
      behavior: still ? 'auto' : 'smooth',
    })
  }, [])

  useEffect(() => {
    const strip = trackRef.current
    if (!strip) return

    let frame = 0
    const settle = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }

    measure()
    strip.addEventListener('scroll', settle, { passive: true })

    /* Observed rather than listened for on a media query: the card is sized as
       a share of this box, so its width also changes when Vazirmatn finally
       loads, when the page is zoomed and when a phone is rotated — none of
       which cross a breakpoint. */
    const observer = new ResizeObserver(settle)
    observer.observe(strip)

    return () => {
      strip.removeEventListener('scroll', settle)
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [measure])

  if (items.length === 0) return null

  return (
    <div
      role="group"
      aria-roledescription={copy.roleDescription}
      aria-label={copy.label}
      className="mt-9"
    >
      {/*
        No `tabIndex` on the track and no arrow-key handler. Every card inside
        it is a button, so Tab already walks the strip in reading order and the
        browser scrolls each card into view as it goes — that, not the arrows,
        is the keyboard path through this gallery. A focus stop on the
        container as well would be an eleventh tab that does nothing visible,
        and hijacking the arrow keys from a button the visitor is already using
        would scroll the card out from under them.
      */}
      <ul
        ref={trackRef}
        aria-label={copy.listLabel(toPersianDigits(items.length))}
        className={track}
      >
        {items.map((doc) => (
          <li
            key={doc.id}
            /* No <Reveal> in here. Its observer watches the viewport, so a card
               waiting off the end of the strip is genuinely not intersecting
               and would sit at zero opacity until it was paged into view — a
               fade on every press of an arrow, on content already on the
               page. */
            className="flex w-1/2 shrink-0 snap-start px-1.5 lg:w-1/4 lg:px-2.5"
          >
            <CredentialTile doc={doc} variant="gallery" />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-center gap-4">
        {/*
          `aria-disabled` rather than `disabled`. A button that disables itself
          under the reader's own finger drops focus to <body>, and having just
          tabbed to the end of the strip is exactly when that happens. It stays
          focusable and announces itself as unavailable; the guard inside the
          handler is for the keyboard, which `pointer-events-none` does not
          cover. The attribute and the variant have to stay together.

          Previous sits at the inline start — the right-hand side in RTL — and
          carries the chevron that points that way, as in the testimonials
          strip.
        */}
        <button
          type="button"
          onClick={() => {
            if (!edges.start) page(-1)
          }}
          aria-disabled={edges.start}
          aria-label={copy.previous}
          className={arrow}
        >
          <ChevronRightIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!edges.end) page(1)
          }}
          aria-disabled={edges.end}
          aria-label={copy.next}
          className={arrow}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}
