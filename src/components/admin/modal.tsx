'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { CloseIcon } from '@/components/icons'

/**
 * Built on the native <dialog> element, which gives focus trapping, Esc to
 * dismiss, inertness of the page behind, and scroll locking for free —
 * all of which are easy to get subtly wrong by hand.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicks land on the dialog itself only when they hit the backdrop area.
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={
        'bg-sand-100 text-ink-900 m-auto w-[calc(100%-2rem)] max-w-2xl rounded-[var(--radius-band)] p-0 ' +
        'shadow-[var(--shadow-lift)] backdrop:bg-[rgb(42_42_38/0.45)] backdrop:backdrop-blur-[2px]'
      }
    >
      <div className="max-h-[85dvh] overflow-y-auto p-6 lg:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-ink-900 text-[1.0625rem] font-bold">{title}</h2>
            {description ? (
              <p className="text-ink-400 mt-2 text-[0.8125rem] leading-[1.9]">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="text-ink-400 hover:bg-sand-200 hover:text-ink-900 grid size-9 shrink-0 place-items-center rounded-full transition-colors"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        {children}
      </div>
    </dialog>
  )
}
