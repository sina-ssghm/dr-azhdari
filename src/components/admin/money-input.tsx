'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Number field that groups thousands as you type: 2500000 → 2,500,000.
 *
 * The grouped string is what gets submitted; every server action that reads a
 * money field strips separators before parsing, so no hidden mirror field is
 * needed. Latin digits and ASCII commas are used deliberately — they are what
 * the parser expects, and a numeric entry field is easier to check at a glance
 * in Latin.
 */
export function MoneyInput({
  name,
  defaultValue,
  decimals = 0,
  placeholder,
  className,
  id,
}: {
  name: string
  defaultValue?: number | string
  /** USDT allows two decimals; Toman is whole numbers. */
  decimals?: 0 | 2
  placeholder?: string
  className?: string
  id?: string
}) {
  const group = (raw: string) => {
    if (raw === '') return ''
    const [whole = '', fraction] = raw.split('.')
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return fraction === undefined ? grouped : `${grouped}.${fraction}`
  }

  const clean = (input: string) => {
    // Keep digits, and a single dot when decimals are allowed.
    let raw = input.replace(decimals === 0 ? /[^\d]/g : /[^\d.]/g, '')
    if (decimals === 2) {
      const [whole = '', ...rest] = raw.split('.')
      raw = rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole
    }
    return raw
  }

  const [value, setValue] = useState(() => group(clean(String(defaultValue ?? ''))))

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode={decimals === 0 ? 'numeric' : 'decimal'}
      dir="ltr"
      value={value}
      onChange={(event) => setValue(group(clean(event.target.value)))}
      placeholder={placeholder}
      className={cn(
        'border-line w-full rounded-xl border bg-white px-4 py-2.5 text-start text-[0.8125rem]',
        'text-ink-900 placeholder:text-ink-400/70 tabular-nums transition-colors',
        'hover:border-line-strong focus:border-olive-400 focus:outline-none',
        className
      )}
    />
  )
}
