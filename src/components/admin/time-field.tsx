'use client'

import { useRef, useState } from 'react'
import { minutesToTime, timeToMinutes } from '@/lib/time'
import { cn, toLatinDigits } from '@/lib/utils'

const digitsOf = (value: string) => toLatinDigits(value).replace(/\D/g, '')

/**
 * Split typed digits into hour and minute parts.
 *
 * A leading 3–9 cannot begin a two-digit hour, so it stands alone: typing
 * `823` gives 08:23, while `1930` gives 19:30. That is what makes four
 * keystrokes enough for every time of day.
 */
function split(digits: string) {
  const hourLength = (digits[0] ?? '') >= '3' ? 1 : 2
  return {
    hourLength,
    /** Total digits worth keeping: the hour plus two minutes. */
    limit: hourLength + 2,
    hour: digits.slice(0, hourLength),
    minute: digits.slice(hourLength, hourLength + 2),
  }
}

/**
 * What the field shows mid-entry — the colon appears once the hour is done.
 *
 * The hour is shown clamped and padded, because it has already been committed
 * to the parent by then: typing 24 must not sit on screen as "24:" when 23:00
 * is what was stored. Minutes need no clamp, since a single digit is always
 * valid and two complete the entry.
 */
function display(digits: string): string {
  const { hourLength, hour, minute } = split(digits)
  if (digits.length < hourLength) return hour
  return `${String(Math.min(Number(hour), 23)).padStart(2, '0')}:${minute}`
}

function parse(digits: string): string | null {
  if (digits.length === 0) return null
  const { hour, minute } = split(digits)
  return minutesToTime(
    Math.min(Number(hour), 23) * 60 + Math.min(Number(minute || '0'), 59)
  )
}

/**
 * Free-form time entry: click it, type four digits, done.
 *
 * Replaces a half-hour <select>, which could not express 08:23 at all. Any
 * minute of the day is reachable, so the schedule is no longer bent to fit the
 * control.
 *
 * Every keystroke commits, rather than waiting for blur — the schedule is
 * submitted from a hidden field built out of parent state, so an uncommitted
 * draft sitting in the input would be silently dropped by a Save click.
 */
export function TimeField({
  value,
  onChange,
  label,
  invalid = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  invalid?: boolean
  className?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const reselect = useRef(0)

  /**
   * Select the whole time so the next digit replaces it.
   *
   * The deferred second pass is for Safari on iOS, which collapses the
   * selection to a caret once it has finished handling the tap. It is
   * cancelled the moment a key arrives — left to run, it would re-select
   * mid-entry and the second digit typed would wipe the first.
   */
  const selectAll = (element: HTMLInputElement) => {
    element.select()
    cancelAnimationFrame(reselect.current)
    reselect.current = requestAnimationFrame(() => {
      if (document.activeElement === element) element.select()
    })
  }

  const nudge = (delta: number) => {
    onChange(minutesToTime((timeToMinutes(value) + delta + 24 * 60) % (24 * 60)))
    setDraft(null)
  }

  const apply = (digits: string) => {
    const next = parse(digits)
    if (next) onChange(next)
    // Empty or complete, show the stored value; only a partial entry gets a
    // draft. An empty box that still holds the old time in parent state is a
    // lie the Save button would act on.
    setDraft(
      digits.length === 0 || digits.length === split(digits).limit
        ? null
        : display(digits)
    )
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      dir="ltr"
      aria-label={label}
      title="چهار رقم را پشت سر هم وارد کنید — مثلاً ۰۸۲۳ برای ۰۸:۲۳"
      value={draft ?? value}
      // Tapping the field selects the whole time, so the first digit typed
      // replaces it instead of landing wherever the caret happened to fall.
      onFocus={(event) => selectAll(event.currentTarget)}
      // Focus only fires once. Tapping a field that already has focus — the
      // natural "start this one over" gesture — would otherwise just move the
      // caret, and the next digit would be inserted into the middle: 11:45
      // tapped and given a 7 became 11:59.
      onClick={(event) => selectAll(event.currentTarget)}
      // Without this a desktop click would drop the selection again on release.
      onMouseUp={(event) => event.preventDefault()}
      onChange={(event) => {
        cancelAnimationFrame(reselect.current)
        const typed = digitsOf(event.target.value)
        apply(typed.slice(0, split(typed).limit))
      }}
      // The draft is display-only; dropping it snaps the field back to the
      // canonical zero-padded value.
      onBlur={() => setDraft(null)}
      onKeyDown={(event) => {
        cancelAnimationFrame(reselect.current)
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault()
          // Shift steps a whole hour — a working day is usually adjusted in
          // hours, and holding an arrow for 60 presses is not adjustment.
          const step = event.shiftKey ? 60 : 1
          nudge(event.key === 'ArrowUp' ? step : -step)
          return
        }

        if (event.key !== 'Backspace') return
        const element = event.currentTarget
        const caret = element.selectionStart ?? 0
        if (caret !== element.value.length || caret !== element.selectionEnd) return
        if (!element.value.endsWith(':')) return

        // The caret sits after the colon this field inserted itself. Deleting
        // it would leave the same digits, display() would put it straight back,
        // and backspace would look broken — so drop a digit instead.
        event.preventDefault()
        apply(digitsOf(element.value).slice(0, -1))
      }}
      className={cn(
        'border-line w-[4.75rem] shrink-0 rounded-lg border bg-white px-2 py-1.5 text-center',
        'text-[0.8125rem] tabular-nums transition-colors duration-200',
        'hover:border-line-strong focus:border-olive-400 focus:outline-none',
        invalid && 'border-red-400',
        className
      )}
    />
  )
}
