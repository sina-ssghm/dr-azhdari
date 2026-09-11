'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * The secondary actions of a row, behind a single button.
 *
 * A row can offer eight things at once; showing them all turns the list into a
 * wall of identical links where the two that matter — cancel and delete — are
 * no easier to find than the rest.
 *
 * Deliberately stays open while an action runs: the buttons inside own their
 * pending spinner and their failure message, and closing the menu underneath
 * them would throw both away.
 */
export function OverflowMenu({
  label = 'گزینه‌های بیشتر',
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  /** Opens upward when there is not enough room beneath the button. */
  const [dropUp, setDropUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Measured on open: a row near the bottom of the screen would otherwise
  // drop its menu below the fold, where it reads as "nothing happened".
  useEffect(() => {
    if (!open) return
    const trigger = ref.current?.firstElementChild
    if (!trigger) return
    const { bottom } = trigger.getBoundingClientRect()
    setDropUp(window.innerHeight - bottom < 190)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      // Clicks inside a nested <dialog> still land inside this subtree, so a
      // confirmation prompt does not dismiss the menu behind it.
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="text-ink-400 hover:bg-sand-200 hover:text-ink-900 grid size-8 place-items-center rounded-full transition-colors"
      >
        <MoreIcon className="size-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            'border-line absolute end-0 z-20 flex min-w-[9.5rem] flex-col items-stretch gap-0.5',
            'rounded-xl border bg-white p-1.5 shadow-[var(--shadow-lift)]',
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
