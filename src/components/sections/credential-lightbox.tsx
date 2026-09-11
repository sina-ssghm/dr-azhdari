'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '@/components/icons'
import { about, allCredentials } from '@/content/about'
import { toPersianDigits } from '@/lib/utils'

const TITLE_ID = 'credential-lightbox-title'

const control =
  'text-ink-500 border-line grid size-10 shrink-0 place-items-center rounded-full ' +
  'border bg-white transition-colors hover:border-olive-400 hover:text-olive-700'

/**
 * One scan, large enough to read, with the rest of the collection a key away.
 *
 * A native <dialog> opened with `showModal()`, following the comment form
 * rather than inventing a second pattern: the focus trap, Escape, the inert
 * background and the top layer all come with the element, and every one of
 * them is easy to get subtly wrong by hand.
 *
 * Two things are added on top of that pattern, both for reasons this dialog
 * has and a short form does not.
 *
 * It locks the page behind it, in the same idiom the header's mobile drawer
 * already uses — save `body.style.overflow`, set it to hidden, put the saved
 * value back. A <dialog> makes the document inert but does not stop it
 * scrolling, which is invisible behind a small panel and very visible behind
 * one that covers the viewport while somebody drags a document around inside
 * it.
 *
 * And every dismissal — the close button, the backdrop, Escape — goes through
 * `dialog.close()` rather than calling the handler directly, so focus is
 * always handed back at the same moment: after `open` goes false and the
 * document stops being inert, and before React removes the node. Unmounting an
 * open dialog closes it just as well and silently loses the restoration, since
 * there is nothing left to restore from.
 */
export function CredentialLightbox({
  index,
  onSelect,
  onClose,
}: {
  index: number
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const copy = about.viewer
  const dialogRef = useRef<HTMLDialogElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  // The component stays mounted while paging, so a new scan starts at its own
  // beginning rather than wherever the last one happened to be scrolled to.
  useEffect(() => {
    const pane = paneRef.current
    if (pane) pane.scrollTop = 0
  }, [index])

  const doc = allCredentials[index]
  if (!doc) return null

  const dismiss = () => dialogRef.current?.close()

  const step = (delta: number) => {
    const total = allCredentials.length
    // Wraps rather than stopping. Fourteen documents in no ranked order, and
    // an arrow that silently does nothing at one end reads as broken.
    const next = allCredentials[(index + delta + total) % total]
    if (next) onSelect(next.id)
  }

  const position = copy.position(
    toPersianDigits(index + 1),
    toPersianDigits(allCredentials.length)
  )

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={TITLE_ID}
      onClick={(event) => {
        /* Anywhere that is not the panel. The dialog fills the viewport and
           holds one centring box in front of it, so a click on either is a
           click on the darkness around the document — a lightbox that closes
           only on the few pixels the panel happens not to cover is a puzzle
           rather than an affordance. */
        if (event.target === dialogRef.current || event.target === shellRef.current) {
          dismiss()
        }
      }}
      onKeyDown={(event) => {
        // In RTL the next document lies to the left, so the arrows mean the
        // opposite of what they would in a Latin layout — the same reading the
        // testimonials strip takes, so the two do not disagree. Both are
        // prevented so they do not also scroll the image pane.
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          step(1)
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          step(-1)
        }
        if (event.key === 'Home') {
          event.preventDefault()
          const first = allCredentials[0]
          if (first) onSelect(first.id)
        }
        if (event.key === 'End') {
          event.preventDefault()
          const last = allCredentials[allCredentials.length - 1]
          if (last) onSelect(last.id)
        }
      }}
      className={
        'fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-3 sm:p-6 ' +
        'backdrop:bg-[rgb(42_42_38/0.82)] backdrop:backdrop-blur-[3px]'
      }
    >
      {/* A plain centring box rather than `display:flex` on the dialog itself.
          The `open:` variant would have to win against the UA's
          `dialog:not([open]) { display: none }`, and a panel that quietly
          top-aligns after a Tailwind upgrade is not a failure worth risking
          for one element. */}
      <div ref={shellRef} className="flex h-full items-center justify-center">
        <div className="bg-sand-100 flex max-h-full w-full max-w-[58rem] flex-col overflow-hidden rounded-[var(--radius-band)] shadow-[var(--shadow-lift)]">
          <div className="flex items-start justify-between gap-4 p-5 pb-4 sm:p-6 sm:pb-4">
            <div className="min-w-0">
              <h2
                id={TITLE_ID}
                className="text-ink-900 text-[0.9375rem] leading-[1.8] font-bold sm:text-[1.0625rem]"
              >
                {doc.title}
              </h2>
              <p className="text-ink-500 mt-1.5 text-[0.8125rem] leading-[1.9]">
                {doc.issuer}
              </p>
            </div>

            <button
              type="button"
              onClick={dismiss}
              aria-label={copy.close}
              className="text-ink-500 hover:bg-sand-200 grid size-10 shrink-0 place-items-center rounded-full transition-colors"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>

          {/* `min-h-0` is what lets this pane shrink inside the flex column, so
              a tall scan scrolls within the panel instead of pushing the title
              and the controls off the ends of a short window and making them
              unreachable. `overscroll-contain` keeps a scroll that bottoms out
              in here from chaining to whatever is behind. */}
          <div
            ref={paneRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 py-4 sm:px-6"
          >
            {/* Capped at the 900px these were scanned at, because that is all
                there is: enlarging past it would only blur the paper. The
                intrinsic size keeps the panel from jumping between a 900×572
                document and a 900×705 one while paging. The `alt` is the
                document's own description, read here and only here — this is
                the one place the image is the content rather than a label for
                a control. */}
            <Image
              key={doc.id}
              src={doc.src}
              alt={doc.alt}
              width={doc.width}
              height={doc.height}
              quality={80}
              priority
              sizes="(min-width: 1024px) 880px, (min-width: 640px) 600px, 366px"
              className="mx-auto h-auto w-full max-w-[900px] rounded-lg"
            />
          </div>

          {/* A dialog whose accessible name changes is not re-announced, so
              paging — which deliberately leaves focus on the arrow that was
              pressed — would otherwise be silent. This says the position and
              what arrived. */}
          <p aria-live="polite" className="sr-only">
            {`${position} — ${doc.title}`}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pt-4 sm:p-6 sm:pt-4">
            {/* Where a phone goes to actually read the thing: the file itself,
                in the browser's own image viewer, which pinches, rotates and
                saves better than anything built inside a dialog. One tap is a
                cheap price for never having to try. */}
            <a
              href={doc.src}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg text-[0.8125rem] text-olive-700 underline underline-offset-4 transition-colors hover:text-olive-800"
            >
              {copy.openOriginal}
            </a>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={copy.previous}
                className={control}
              >
                <ChevronRightIcon className="size-4" />
              </button>

              <span className="text-ink-700 min-w-[4.5rem] text-center text-[0.8125rem] tabular-nums">
                {position}
              </span>

              <button
                type="button"
                onClick={() => step(1)}
                aria-label={copy.next}
                className={control}
              >
                <ChevronLeftIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  )
}
