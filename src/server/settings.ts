import 'server-only'

import { cache } from 'react'
import { bookingPage, type ServiceId } from '@/content/booking-page'
import { contact as contactDefaults } from '@/content/site'
import { getPool } from '@/lib/db'
import type { PriceTriple } from '@/lib/payment'
import { toLatinDigits } from '@/lib/utils'

/** The services a visitor can actually book — the source for pricing rows. */
export const BOOKABLE_SERVICES = bookingPage.service.options
export const BOOKABLE_SERVICE_IDS = BOOKABLE_SERVICES.map((s) => s.id)

export function serviceTitle(id: string): string {
  return BOOKABLE_SERVICES.find((s) => s.id === id)?.title ?? id
}

/** Session lengths a service offers, e.g. [60] or [90, 120]. */
export function serviceDurations(id: string): readonly number[] {
  return BOOKABLE_SERVICES.find((s) => s.id === id)?.durations ?? [60]
}

/**
 * Every length the practice has ever offered.
 *
 * Editing an existing appointment validates against this rather than the
 * service's current lengths: hypnotherapy sessions booked at 90 or 120 minutes
 * still exist, and rejecting them would make those rows uneditable — the admin
 * could not even correct a phone number.
 */
export const LEGACY_DURATIONS = [60, 90, 120] as const

/** Every (service, duration) pair that needs a price row. */
export const PRICE_TIERS = BOOKABLE_SERVICES.flatMap((service) =>
  service.durations.map((duration) => ({
    serviceId: service.id,
    title: service.title,
    durationMin: duration,
  }))
)

/* -------------------------- duration pricing -------------------------- */

export type DurationPrice = { serviceId: string; durationMin: number } & PriceTriple

/** Always returns a row per tier, defaulting to zero. */
export async function getDurationPrices(): Promise<DurationPrice[]> {
  const { rows } = await getPool().query<{
    service_id: string
    duration_min: number
    price_irt: string
    price_irt_abroad: string
    price_usdt: string
  }>(
    `select service_id, duration_min, price_irt, price_irt_abroad, price_usdt
       from service_duration_price`
  )

  const stored = new Map(rows.map((r) => [`${r.service_id}:${r.duration_min}`, r]))

  return PRICE_TIERS.map((tier) => {
    const row = stored.get(`${tier.serviceId}:${tier.durationMin}`)
    return {
      serviceId: tier.serviceId,
      durationMin: tier.durationMin,
      priceIrt: row ? Number(row.price_irt) : 0,
      priceIrtAbroad: row ? Number(row.price_irt_abroad) : 0,
      priceUsdt: row ? Number(row.price_usdt) : 0,
    }
  })
}

export async function getDurationPrice(
  serviceId: string,
  durationMin: number
): Promise<DurationPrice | null> {
  const prices = await getDurationPrices()
  return (
    prices.find((p) => p.serviceId === serviceId && p.durationMin === durationMin) ?? null
  )
}

export async function saveDurationPrices(prices: DurationPrice[]): Promise<void> {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    for (const price of prices) {
      await client.query(
        `insert into service_duration_price
           (service_id, duration_min, price_irt, price_irt_abroad, price_usdt, updated_at)
         values ($1, $2, $3, $4, $5, now())
         on conflict (service_id, duration_min) do update
           set price_irt = excluded.price_irt,
               price_irt_abroad = excluded.price_irt_abroad,
               price_usdt = excluded.price_usdt,
               updated_at = now()`,
        [
          price.serviceId,
          price.durationMin,
          price.priceIrt,
          price.priceIrtAbroad,
          price.priceUsdt,
        ]
      )
    }
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

/* --------------------------- payment settings -------------------------- */

/** Everything the payment settings form owns. */
export const PAYMENT_SETTING_KEYS = [
  'card_number',
  'card_sheba',
  'card_holder',
  'usdt_address',
  'usdt_network',
] as const

/**
 * Notification wiring, written from the dashboard rather than the settings
 * form — kept a separate list so adding one here does not oblige the payment
 * form to account for it.
 */
export const NOTIFICATION_SETTING_KEYS = [
  // One bot; its recipients are rows in `telegram_recipient`, not a setting.
  'telegram_bot_token',
  'vapid_public',
  'vapid_private',
] as const

/**
 * The footer's contact block — the only settings anything outside /admin
 * reads. A separate list because the payment form does not own them, and
 * because unlike a card number every one of them has a sane default.
 */
export const CONTACT_SETTING_KEYS = [
  'contact_phone_primary',
  'contact_phone_secondary',
  'contact_phone_secondary_label',
  'contact_phone_mobile',
  'contact_phone_mobile_label',
  'contact_email',
  'contact_clinic',
  'contact_address',
] as const

export const SETTING_KEYS = [
  ...PAYMENT_SETTING_KEYS,
  ...NOTIFICATION_SETTING_KEYS,
  ...CONTACT_SETTING_KEYS,
] as const

export type PaymentSettings = Record<(typeof PAYMENT_SETTING_KEYS)[number], string>

export type ContactSettings = Record<(typeof CONTACT_SETTING_KEYS)[number], string>

export type SettingKey = (typeof SETTING_KEYS)[number]
export type Settings = Record<SettingKey, string>

const EMPTY_SETTINGS = Object.fromEntries(
  SETTING_KEYS.map((key) => [key, ''])
) as Settings

export async function getSettings(): Promise<Settings> {
  const { rows } = await getPool().query<{ key: string; value: string }>(
    'select key, value from app_setting'
  )
  const settings = { ...EMPTY_SETTINGS }
  for (const row of rows) {
    if ((SETTING_KEYS as readonly string[]).includes(row.key)) {
      settings[row.key as SettingKey] = row.value
    }
  }
  return settings
}

export async function saveSettings(values: Partial<Settings>): Promise<void> {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    for (const [key, value] of Object.entries(values)) {
      await client.query(
        `insert into app_setting (key, value, updated_at) values ($1, $2, now())
         on conflict (key) do update set value = excluded.value, updated_at = now()`,
        [key, value ?? '']
      )
    }
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

/* ----------------------- contact details (footer) ---------------------- */

/**
 * Keyed by setting key rather than by a friendlier name, so this one
 * annotation is what fails the build if a key is added to
 * `CONTACT_SETTING_KEYS` and forgotten in `content/site.ts`, or the other way
 * round.
 */
const CONTACT_DEFAULTS: ContactSettings = contactDefaults

/** What the footer actually renders — the phone rows, then the rest. */
export type ContactDetails = {
  /** One caption can cover more than one number — the clinic's does. */
  phones: readonly { label: string; values: readonly string[] }[]
  email: string
  clinic: string
  address: string
}

/** Printed inside `tel:`, so these are sanitised rather than just trimmed. */
const PHONE_KEYS: readonly string[] = [
  'contact_phone_primary',
  'contact_phone_secondary',
  'contact_phone_mobile',
]

/** Only digits dial. Also normalises a number typed on a Persian keyboard. */
const dialable = (value: string) => {
  const digits = toLatinDigits(value).replace(/[^\d+]/g, '')
  return digits.length >= 8 ? digits : ''
}

const shape = (values: ContactSettings): ContactDetails => ({
  // Groups without a number are dropped rather than rendered as a bare
  // caption. Every key ships a default, so this only fires if one is emptied.
  phones: [
    {
      label: values.contact_phone_secondary_label,
      values: [values.contact_phone_secondary, values.contact_phone_primary],
    },
    {
      label: values.contact_phone_mobile_label,
      values: [values.contact_phone_mobile],
    },
  ]
    .map((group) => ({ ...group, values: group.values.filter(Boolean) }))
    .filter((group) => group.values.length > 0),
  email: values.contact_email,
  clinic: values.contact_clinic,
  address: values.contact_address,
})

/**
 * A failed read costs one attempt, not one per page.
 *
 * The pool waits five seconds for a connection and this footer is on every
 * page, so without a backoff a database that is merely down would add that
 * five seconds to every render on the site rather than to the queries that
 * actually need the data.
 */
let contactOfflineUntil = 0
const CONTACT_BACKOFF_MS = 60_000

/**
 * The contact details the footer renders.
 *
 * Deliberately not `getSettings()`. This runs inside `not-found.tsx`, which
 * Next prerenders at build time inside the image, where DATABASE_URL is unset
 * and there is no database to reach — anything that throws here fails
 * `docker compose build web` outright. So an unreachable database is a fall
 * back to the defaults in `content/site.ts`, not an error.
 *
 * A blank value falls back the same way and per field: an admin who clears
 * the address gets the client's address back rather than an empty line under
 * a map pin. The consequence is deliberate — clearing a box cannot delete a
 * row, because the design has a fixed set of them.
 *
 * `cache` only dedupes within one render; it is not a data cache. There is
 * deliberately no `unstable_cache` here: it would add a second thing to
 * invalidate on save, and a footer that silently refuses to update for an
 * hour is a worse failure than one extra tiny query on a table of ~15 rows.
 */
export const getContactDetails = cache(async (): Promise<ContactDetails> => {
  // Not an error worth logging: this is `next build`, every single time.
  if (!process.env.DATABASE_URL) return shape(CONTACT_DEFAULTS)
  if (Date.now() < contactOfflineUntil) return shape(CONTACT_DEFAULTS)

  try {
    // The same whole-table read `getSettings` does. `app_setting` holds about
    // fifteen rows, so filtering in JS is cheaper than teaching Postgres to
    // infer the type of an array parameter.
    const { rows } = await getPool().query<{ key: string; value: string }>(
      'select key, value from app_setting'
    )
    const stored = new Map(rows.map((row) => [row.key, row.value]))

    return shape(
      Object.fromEntries(
        CONTACT_SETTING_KEYS.map((key) => {
          const raw = (stored.get(key) ?? '').trim()
          const value = PHONE_KEYS.includes(key) ? dialable(raw) : raw
          return [key, value || CONTACT_DEFAULTS[key]]
        })
      ) as ContactSettings
    )
  } catch (error) {
    contactOfflineUntil = Date.now() + CONTACT_BACKOFF_MS
    console.error('[settings] contact details unavailable; using defaults', error)
    return shape(CONTACT_DEFAULTS)
  }
})

/* ---------------------------- working hours ---------------------------- */

export type WorkingHour = { id: number; weekday: number; starts: string; ends: string }

/** `HH:MM:SS` from Postgres → `HH:MM` for form inputs. */
const trimTime = (value: string) => value.slice(0, 5)

export async function getWorkingHours(): Promise<WorkingHour[]> {
  const { rows } = await getPool().query<{
    id: number
    weekday: number
    starts: string
    ends: string
  }>(
    'select id, weekday, starts::text, ends::text from working_hour order by weekday, starts'
  )

  return rows.map((r) => ({
    id: r.id,
    weekday: r.weekday,
    starts: trimTime(r.starts),
    ends: trimTime(r.ends),
  }))
}

/** Replaces the whole schedule — the editor submits every span at once. */
export async function saveWorkingHours(
  spans: Array<{ weekday: number; starts: string; ends: string }>
): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('delete from working_hour')
    for (const span of spans) {
      await client.query(
        'insert into working_hour (weekday, starts, ends) values ($1, $2, $3)',
        [span.weekday, span.starts, span.ends]
      )
    }
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export type { ServiceId }
