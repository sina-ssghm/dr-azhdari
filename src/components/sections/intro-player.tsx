'use client'

import { useRef, useState } from 'react'
import { PlayIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * The intro video, behind its own still.
 *
 * `preload="none"` and no `<source>` until the first press: the file is tens
 * of megabytes and most visitors will never play it. Until then the browser
 * fetches nothing but the poster, which is a photograph the page would be
 * showing anyway.
 */
export function IntroPlayer({
  src,
  poster,
  label,
  play,
  tone = 'light',
}: {
  src: string
  poster: string
  /** Describes the clip for anyone who cannot see it. */
  label: string
  /** The button's accessible name. */
  play: string
  /**
   * The band the player sits on. Only the focus ring depends on it: the ring
   * is offset outside the frame, so it lands on the band rather than on the
   * poster, and olive-400 measures 3.40:1 on the light band but 2.79:1 on
   * olive-900 — under the 3:1 a focus indicator has to clear.
   */
  tone?: 'light' | 'dark'
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)

  const start = () => {
    setStarted(true)
    // The <source> is added by this render, so the element has to be told to
    // pick it up before it will play anything.
    requestAnimationFrame(() => {
      const video = videoRef.current
      if (!video) return
      video.load()
      void video.play().catch(() => {
        // Autoplay policies can refuse even a user-initiated play on some
        // browsers; the controls are showing by then, so the visitor can
        // press the native button instead.
      })
    })
  }

  return (
    /*
      The corners are rounded on the video itself rather than by clipping the
      wrapper. `overflow-hidden` here used to swallow the play button's focus
      ring whole — the button is `inset-0`, so its border box *is* the clip,
      and every pixel of a ring offset outside it was cut off: a keyboard
      visitor got no focus indicator at all. A replaced element honours its
      own border-radius, so nothing about the frame changes and the ring now
      has the band to land on.
    */
    <div className="bg-ink-900/5 relative rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
      <video
        ref={videoRef}
        poster={poster}
        preload="none"
        playsInline
        controls={started}
        /*
          Chromium names a media element from its own "Unable to play media."
          string while it has nothing to play, and that override beats
          `aria-label` — so before the first press this element announced an
          English failure notice in the middle of a Persian page. Until then
          there is no clip, only the still: the frame is decoration and the
          play button is what carries a name. The label goes on once there is
          something for it to describe.
        */
        aria-hidden={started ? undefined : true}
        aria-label={started ? label : undefined}
        // 3:2 to match the still exactly, and `contain` rather than `cover`
        // because the clip is 16:9: cover would crop the difference off the
        // top and bottom of a talking head. Contained, the poster fills the
        // frame edge to edge and the video letterboxes by a few per cent.
        className="aspect-[3/2] w-full rounded-[var(--radius-card)] bg-black object-contain"
      >
        {started ? <source src={src} type="video/mp4" /> : null}
      </video>

      {!started ? (
        <button
          type="button"
          onClick={start}
          aria-label={play}
          // Rounded to the frame so the offset ring traces the card's corners
          // instead of squaring them off.
          className={cn(
            'group absolute inset-0 grid place-items-center rounded-[var(--radius-card)] focus-visible:outline-2 focus-visible:outline-offset-4',
            tone === 'dark'
              ? 'focus-visible:outline-sand-100'
              : 'focus-visible:outline-olive-400'
          )}
        >
          {/* A ring rather than a solid disc, so the still stays readable
              underneath it. */}
          <span className="grid size-[4.5rem] place-items-center rounded-full border-2 border-white/90 bg-black/15 backdrop-blur-[2px] transition-all duration-300 ease-[var(--ease-out-soft)] group-hover:scale-105 group-hover:bg-black/25">
            <PlayIcon className="size-9 text-white" strokeWidth={1.2} />
          </span>
        </button>
      ) : null}
    </div>
  )
}
