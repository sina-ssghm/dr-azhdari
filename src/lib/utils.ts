import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names, resolving conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

/** Render Latin digits as Persian ones (for display copy, never for `tel:` hrefs). */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d)
}

/**
 * Persian and Arabic-Indic digits → Latin.
 *
 * Someone searching for a phone number will usually type ۰۹۱۲…, but numbers
 * are stored with Latin digits, so the query must be normalised first.
 */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
}

/**
 * Break a long run of characters into readable groups:
 * `6037997912345678` → `6037 9979 1234 5678`.
 *
 * Card numbers and IBANs are printed this way everywhere, and an unbroken
 * 24-character run is impossible to check by eye against a bank statement.
 */
export function groupChars(value: string, size = 4): string {
  return (value.match(new RegExp(`.{1,${size}}`, 'g')) ?? []).join(' ')
}

/**
 * Money for display: Toman as whole numbers, USDT to two decimals.
 *
 * Uses `fa-IR` so the thousands separator is the Persian «٬» rather than an
 * ASCII comma, which looks out of place next to Persian numerals.
 */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** Toman for both card rails, tether for crypto. */
export type Currency = 'IRT' | 'USDT'

export function formatAmount(value: number, currency: Currency): string {
  if (currency === 'IRT') return `${formatNumber(Math.round(value))} تومان`

  // Trailing zeros dropped: ۳۵ rather than ۳۵٫۰۰, while ۳۴٫۵ keeps its decimal.
  const amount = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
  return `${amount} تتر`
}

/**
 * A price, where nothing to pay means free.
 *
 * Separate from {@link formatAmount} because zero does not always mean that:
 * an appointment the practice booked itself carries no amount because payment
 * was handled off the site, and calling that «رایگان» would be a lie. On a
 * test tariff, though, zero is a deliberate setting — so «۰ تومان» is just a
 * clumsy way of writing it.
 */
export function formatPrice(value: number, currency: Currency): string {
  return value > 0 ? formatAmount(value, currency) : 'رایگان'
}
