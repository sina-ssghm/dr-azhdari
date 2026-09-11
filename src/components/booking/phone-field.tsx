'use client'

import { useEffect, useRef, useState } from 'react'
import type { CountryCode } from 'libphonenumber-js/min'
import { CheckIcon, CloseIcon } from '@/components/icons'
import { Flag } from '@/components/ui/flag'
import { bookingPage } from '@/content/booking-page'
import {
  DEFAULT_COUNTRY,
  findCountry,
  isValidPhone,
  searchCountries,
  splitE164,
  toE164,
} from '@/lib/phone'
import { cn, toLatinDigits } from '@/lib/utils'

/**
 * Phone entry with a country picker.
 *
 * The number is held as two parts and handed up as E.164, so what gets stored
 * is unambiguous no matter which country the client is calling from — a bare
 * `0912…` means nothing to someone dialling from abroad.
 *
 * A leading zero is dropped as it is typed: Iranians write 0912, but the trunk
 * prefix is not part of the international number.
 */
export function PhoneField({
  value,
  onChange,
  id = 'booking-phone',
}: {
  /** E.164, or '' when nothing has been entered yet. */
  value: string
  onChange: (e164: string) => void
  id?: string
}) {
  const copy = bookingPage.details.fields.phone

  const parsed = splitE164(value)
  const [country, setCountry] = useState<CountryCode>(parsed?.country ?? DEFAULT_COUNTRY)
  const [national, setNational] = useState(parsed?.national ?? '')
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [touched, setTouched] = useState(false)

  const boxRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = findCountry(country)
  const matches = searchCountries(term)

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()

    const onPointerDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
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

  const emit = (nextCountry: CountryCode, nextNational: string) => {
    setCountry(nextCountry)
    setNational(nextNational)
    onChange(toE164(nextCountry, nextNational))
  }

  const invalid = touched && national !== '' && !isValidPhone(toE164(country, national))

  return (
    <div ref={boxRef} className="relative">
      <div
        dir="ltr"
        className={cn(
          'border-line flex items-stretch overflow-hidden rounded-xl border bg-white',
          'transition-colors duration-200 focus-within:border-olive-400',
          invalid ? 'border-red-400' : 'hover:border-line-strong'
        )}
      >
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value)
            setTerm('')
          }}
          aria-label={copy.country}
          aria-expanded={open}
          className="border-line hover:bg-sand-100 flex shrink-0 items-center gap-1.5 border-e px-3 text-[0.8125rem] transition-colors"
        >
          <Flag country={selected} />
          <span className="text-ink-700 tabular-nums">+{selected?.dial}</span>
        </button>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          dir="ltr"
          value={national}
          onChange={(event) =>
            // The trunk zero belongs to the national format only.
            emit(
              country,
              toLatinDigits(event.target.value).replace(/\D/g, '').replace(/^0+/, '')
            )
          }
          onBlur={() => setTouched(true)}
          placeholder={copy.placeholder}
          aria-invalid={invalid || undefined}
          className="text-ink-900 placeholder:text-ink-400/70 w-full min-w-0 bg-transparent px-4 py-2.5 text-start text-[0.8125rem] tabular-nums outline-none"
        />
      </div>

      {invalid ? (
        <p role="alert" className="mt-1.5 text-[0.75rem] text-red-700">
          {copy.invalid}
        </p>
      ) : null}

      {open ? (
        <div className="border-line absolute inset-x-0 top-full z-30 mt-1 rounded-2xl border bg-white shadow-[var(--shadow-lift)]">
          <div className="border-line flex items-center gap-2 border-b p-2">
            <input
              ref={searchRef}
              type="text"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={copy.searchCountry}
              className="text-ink-900 placeholder:text-ink-400/70 w-full min-w-0 bg-transparent px-2 py-1.5 text-[0.8125rem] outline-none"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="بستن"
              className="text-ink-400 hover:bg-sand-200 grid size-7 shrink-0 place-items-center rounded-full transition-colors"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </div>

          <ul className="max-h-64 overflow-y-auto p-1">
            {matches.length === 0 ? (
              <li className="text-ink-400 px-3 py-4 text-center text-[0.75rem]">
                {copy.noCountry}
              </li>
            ) : (
              matches.map((option) => (
                <li key={option.code}>
                  <button
                    type="button"
                    onClick={() => {
                      emit(option.code, national)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-[0.8125rem] transition-colors',
                      option.code === country
                        ? 'bg-sand-200 text-ink-900 font-semibold'
                        : 'text-ink-700 hover:bg-sand-100'
                    )}
                  >
                    <Flag country={option} />
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                    <span dir="ltr" className="text-ink-400 shrink-0 tabular-nums">
                      +{option.dial}
                    </span>
                    {option.code === country ? (
                      <CheckIcon className="size-3.5 shrink-0 text-olive-700" />
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
