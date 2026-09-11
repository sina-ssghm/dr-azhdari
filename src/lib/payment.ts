import type { Currency } from '@/lib/utils'

/**
 * The three ways a session can be paid for.
 *
 * A "rail" is a location and an instrument together, because neither alone is
 * enough: the payment page has to pick card-versus-crypto (and `iran_card` and
 * `abroad_card` are both cards), while pricing has to pick one of three
 * tariffs (and those same two cards cost different amounts). Only the pair
 * identifies it, and the fourth combination — crypto inside Iran — is never
 * offered, so one enumerated column beats two columns and a cross-check.
 *
 * These strings are stored in `appointment.payment_method` and constrained by
 * the database, so they must match `migrations/006_abroad_pricing.sql`.
 */
export const PAYMENT_METHOD_IDS = ['iran_card', 'abroad_card', 'abroad_crypto'] as const

export type PaymentId = (typeof PAYMENT_METHOD_IDS)[number]

/** Admin-created appointments are booked without payment. */
export type StoredPaymentMethod = PaymentId | 'none'

export type PaymentRegion = 'iran' | 'abroad'

/** What one (service, duration) costs on each rail. */
export type PriceTriple = {
  priceIrt: number
  priceIrtAbroad: number
  priceUsdt: number
}

export function isPaymentId(value: unknown): value is PaymentId {
  return (
    typeof value === 'string' && (PAYMENT_METHOD_IDS as readonly string[]).includes(value)
  )
}

/** Where the client said they were. Derived, never stored separately. */
export const paymentRegion = (id: PaymentId): PaymentRegion =>
  id === 'iran_card' ? 'iran' : 'abroad'

/**
 * Card-to-card rather than crypto — which panel the payment page shows.
 *
 * `'iran'` is accepted for bookings made before the rails were split; the
 * migration rewrites them, but a stale render should not show a wallet address
 * to someone who paid by card.
 */
export const isCardPayment = (id: string | null | undefined): boolean =>
  id === 'iran_card' || id === 'abroad_card' || id === 'iran'

/** What unit `amount` is in. Both card rails are toman. */
export const currencyFor = (id: PaymentId): Currency =>
  id === 'abroad_crypto' ? 'USDT' : 'IRT'

/**
 * The one place a rail is turned into a number.
 *
 * Keyed on the rail, never on the currency: `abroad_card` is also IRT, so
 * currency alone would silently charge the domestic tariff.
 */
export function priceFor(
  price: PriceTriple | null,
  id: PaymentId
): { amount: number; currency: Currency } {
  const currency = currencyFor(id)
  if (!price) return { amount: 0, currency }

  if (id === 'iran_card') return { amount: price.priceIrt, currency }
  if (id === 'abroad_card') return { amount: price.priceIrtAbroad, currency }
  return { amount: price.priceUsdt, currency }
}
