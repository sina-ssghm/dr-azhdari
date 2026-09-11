'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { cn, groupChars, toPersianDigits } from '@/lib/utils'

const onlyDigits = (value: string) => value.replace(/\D/g, '')

/** Caret offset in `formatted` that leaves exactly `n` digits to its left. */
function caretAfter(formatted: string, n: number): number {
  if (n <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i]!)) {
      seen += 1
      if (seen === n) return i + 1
    }
  }
  return formatted.length
}

/**
 * Fixed-length numeric field — card numbers and sheba.
 *
 * Digits are grouped as they are typed, because a bare 24-digit run is
 * impossible to check by eye against a bank statement. The grouped string is
 * what gets submitted; the server strips the separators, the same convention
 * <MoneyInput> uses, so no hidden mirror field is needed.
 *
 * `prefix` renders a fixed, non-editable label inside the box (IR for a
 * sheba). It is deliberately outside the input's value: the admin should type
 * only the part that varies, and the server re-attaches it.
 */
export function DigitsInput({
  id,
  name,
  defaultValue,
  length,
  groupSize = 4,
  prefix,
  placeholder,
  className,
}: {
  id?: string
  name: string
  defaultValue?: string
  /** Exact number of digits required — also the most that can be typed. */
  length: number
  groupSize?: number
  prefix?: string
  placeholder?: string
  className?: string
}) {
  const [digits, setDigits] = useState(() =>
    onlyDigits(defaultValue ?? '').slice(0, length)
  )

  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<number | null>(null)

  const group = (value: string) => groupChars(value, groupSize)

  // Regrouping rewrites the whole value, which would otherwise throw the caret
  // to the end on every keystroke typed into the middle of the number.
  useLayoutEffect(() => {
    const position = caretRef.current
    caretRef.current = null
    if (position !== null) inputRef.current?.setSelectionRange(position, position)
  })

  const commit = (next: string, digitsBefore: number) => {
    const capped = next.slice(0, length)
    setDigits(capped)
    caretRef.current = caretAfter(group(capped), Math.min(digitsBefore, capped.length))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace') return

    const element = event.currentTarget
    const start = element.selectionStart ?? 0
    if (start === 0 || start !== element.selectionEnd) return
    if (/\d/.test(element.value[start - 1] ?? '')) return

    // The caret sits just after a separator. Left alone, backspace would eat
    // the space, the value would regroup, and the field would look unchanged —
    // so delete the digit in front of the separator instead.
    event.preventDefault()
    const before = onlyDigits(element.value.slice(0, start)).length
    commit(digits.slice(0, before - 1) + digits.slice(before), before - 1)
  }

  const invalid = digits.length > 0 && digits.length !== length

  return (
    <div
      dir="ltr"
      className={cn(
        'border-line flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5',
        'transition-colors duration-200 focus-within:border-olive-400',
        invalid ? 'border-red-400' : 'hover:border-line-strong',
        className
      )}
    >
      {prefix ? (
        <span
          aria-hidden="true"
          className="text-ink-400 shrink-0 text-[0.8125rem] font-semibold tracking-wide"
        >
          {prefix}
        </span>
      ) : null}

      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={group(digits)}
        onChange={(event) => {
          const element = event.target
          const caret = element.selectionStart ?? element.value.length
          commit(
            onlyDigits(element.value),
            onlyDigits(element.value.slice(0, caret)).length
          )
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={cn(
          'text-ink-900 placeholder:text-ink-400/70 w-full min-w-0 bg-transparent',
          'text-[0.8125rem] tabular-nums outline-none'
        )}
      />

      {invalid ? (
        <span className="shrink-0 text-[0.6875rem] text-red-700 tabular-nums">
          {toPersianDigits(`${digits.length}/${length}`)}
        </span>
      ) : null}
    </div>
  )
}
