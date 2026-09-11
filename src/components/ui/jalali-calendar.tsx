'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import {
  addDays,
  buildMonthGrid,
  describeDate,
  isSameDay,
  jalaliMonthLength,
  startOfJalaliMonth,
  today as todayUtc,
  WEEKDAY_INITIALS,
  type CalendarCell,
} from '@/lib/jalali'
import { cn, toPersianDigits } from '@/lib/utils'

/**
 * Shamsi (Jalali) month picker. Shared by the public booking flow and the
 * admin panel so there is exactly one calendar implementation.
 *
 * Dates are normalised to 12:00 UTC (see lib/jalali) and "today" resolves
 * after mount — the pages using this are prerendered or cached, so a
 * build-time date would be stale and would mismatch during hydration.
 */
export function JalaliCalendar({
  value,
  onChange,
  isDisabled,
  allowPast = false,
  className,
}: {
  value: Date | null
  onChange: (date: Date) => void
  /** Extra rule on top of "past" and "outside this month". */
  isDisabled?: (cell: CalendarCell) => boolean
  /** Booking looks forward; filtering and reporting look back. */
  allowPast?: boolean
  className?: string
}) {
  const [now, setNow] = useState<Date | null>(null)
  const [anchor, setAnchor] = useState<Date | null>(null)

  useEffect(() => {
    const t = todayUtc()
    setNow(t)
    setAnchor(startOfJalaliMonth(t))
  }, [])

  // Follow the selection when it lands outside the month on display.
  useEffect(() => {
    if (!value) return
    setAnchor((current) => {
      const target = startOfJalaliMonth(value)
      return current && current.getTime() === target.getTime() ? current : target
    })
  }, [value])

  const grid = useMemo(
    () => (now && anchor ? buildMonthGrid(anchor, now) : null),
    [anchor, now]
  )

  const shiftMonth = (direction: 1 | -1) =>
    setAnchor((current) => {
      if (!current) return current
      // `current` is always day 1, so both steps are exact regardless of
      // whether the month has 29, 30 or 31 days.
      return direction === 1
        ? addDays(current, jalaliMonthLength(current))
        : startOfJalaliMonth(addDays(current, -1))
    })

  return (
    <div className={cn('border-line rounded-2xl border bg-white p-4', className)}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="ماه قبل"
          className="text-ink-500 hover:bg-sand-200 grid size-8 place-items-center rounded-full transition-colors hover:text-olive-700"
        >
          <ChevronRightIcon className="size-4" />
        </button>

        <p className="text-ink-900 text-[0.8125rem] font-semibold">
          {grid ? toPersianDigits(grid.label) : ' '}
        </p>

        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="ماه بعد"
          className="text-ink-500 hover:bg-sand-200 grid size-8 place-items-center rounded-full transition-colors hover:text-olive-700"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-y-1">
        {WEEKDAY_INITIALS.map((initial, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="text-ink-400 grid h-7 place-items-center text-[0.6875rem]"
          >
            {initial}
          </span>
        ))}

        {(grid?.cells ?? Array.from({ length: 42 }, () => null)).map((cell, i) => {
          if (!cell) return <span key={i} className="h-8" aria-hidden="true" />

          const selected = value != null && isSameDay(cell.date, value)
          const disabled =
            (!allowPast && cell.isPast) || !cell.inMonth || (isDisabled?.(cell) ?? false)

          return (
            <div key={i} className="grid h-8 place-items-center">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(cell.date)}
                aria-label={describeDate(cell.date).full}
                aria-current={cell.isToday ? 'date' : undefined}
                className={cn(
                  'grid size-7 place-items-center rounded-full text-[0.75rem] transition-all duration-200',
                  disabled && 'text-ink-400/45 cursor-default',
                  !disabled && !selected && 'text-ink-700 hover:bg-sand-200',
                  !disabled &&
                    !selected &&
                    cell.isToday &&
                    'font-semibold text-olive-800 ring-1 ring-olive-400',
                  selected && 'bg-olive-700 font-semibold text-white'
                )}
              >
                {toPersianDigits(cell.jd)}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
