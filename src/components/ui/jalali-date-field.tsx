'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarIcon, CloseIcon } from '@/components/icons'
import { JalaliCalendar } from '@/components/ui/jalali-calendar'
import { describeDate } from '@/lib/jalali'
import { cn, toPersianDigits } from '@/lib/utils'

/**
 * Compact Shamsi date input: a button showing the chosen date, opening the
 * shared calendar in a popover. Used where an always-visible month grid would
 * dominate the layout, such as the appointments filter bar.
 */
export function JalaliDateField({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  allowPast = true,
  className,
}: {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  /** Filters look backwards, so past dates must stay selectable. */
  allowPast?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  // Dismiss on outside click and on Escape.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = value ? toPersianDigits(describeDate(value).full) : placeholder

  return (
    <div ref={wrapper} className={cn('relative', className)}>
      <div
        className={cn(
          'border-line flex items-center gap-1 rounded-xl border bg-white transition-colors',
          open ? 'border-olive-400' : 'hover:border-line-strong'
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'flex flex-1 items-center gap-2 px-4 py-2.5 text-start text-[0.8125rem]',
            value ? 'text-ink-900' : 'text-ink-400/80'
          )}
        >
          <CalendarIcon className="text-ink-400 size-4 shrink-0" />
          {label}
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
            aria-label="پاک کردن تاریخ"
            className="text-ink-400 hover:bg-sand-200 hover:text-ink-900 me-2 grid size-6 shrink-0 place-items-center rounded-full transition-colors"
          >
            <CloseIcon className="size-3.5" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute z-30 mt-2 w-[19rem] shadow-[var(--shadow-lift)]">
          <JalaliCalendar
            value={value}
            allowPast={allowPast}
            onChange={(next) => {
              onChange(next)
              setOpen(false)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
