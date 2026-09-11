import 'server-only'

import { getPool } from '@/lib/db'
import type { Currency } from '@/lib/utils'

export type DiscountKind = 'percent' | 'fixed'

/**
 * Re-exported so existing importers keep working; the type itself lives with
 * the formatter that renders it.
 *
 * Note both card rails record 'IRT', so a fixed toman code takes its full
 * value off the abroad tariff too. Deliberate: a percentage code is the way to
 * discount both fairly, and a second set of amounts would be a fourth price
 * concept for the practice to keep in step.
 */
export type { Currency } from '@/lib/utils'

export type DiscountCode = {
  id: number
  code: string
  kind: DiscountKind
  /** Percentage off, when `kind` is 'percent'. */
  percent: number | null
  /** Fixed amounts — a fixed code carries both currencies. */
  amountIrt: number | null
  amountUsdt: number | null
  expiresOn: string | null
  isActive: boolean
  maxUses: number | null
  usedCount: number
  /** Empty means the code applies to every service. */
  serviceIds: string[]
}

export type DiscountInput = Omit<DiscountCode, 'id' | 'usedCount'>

const SELECT = `
  select d.id, d.code, d.kind, d.value, d.amount_irt, d.amount_usdt,
         d.expires_on::text as expires_on, d.is_active, d.max_uses, d.used_count,
         coalesce(
           array_agg(s.service_id) filter (where s.service_id is not null),
           '{}'
         ) as service_ids
    from discount_code d
    left join discount_code_service s on s.discount_code_id = d.id
`

type Row = {
  id: number
  code: string
  kind: DiscountKind
  value: string | null
  amount_irt: string | null
  amount_usdt: string | null
  expires_on: string | null
  is_active: boolean
  max_uses: number | null
  used_count: number
  service_ids: string[]
}

const num = (value: string | null) => (value === null ? null : Number(value))

const toDiscount = (r: Row): DiscountCode => ({
  id: r.id,
  code: r.code,
  kind: r.kind,
  percent: r.kind === 'percent' ? num(r.value) : null,
  amountIrt: num(r.amount_irt),
  amountUsdt: num(r.amount_usdt),
  expiresOn: r.expires_on,
  isActive: r.is_active,
  maxUses: r.max_uses,
  usedCount: r.used_count,
  serviceIds: r.service_ids,
})

export async function listDiscounts(): Promise<DiscountCode[]> {
  const { rows } = await getPool().query<Row>(
    `${SELECT} group by d.id order by d.created_at desc`
  )
  return rows.map(toDiscount)
}

/** Column values for an insert/update, keyed off the discount kind. */
function shape(input: DiscountInput) {
  const isPercent = input.kind === 'percent'
  return [
    input.code,
    input.kind,
    isPercent ? input.percent : null,
    isPercent ? null : (input.amountIrt ?? 0),
    isPercent ? null : (input.amountUsdt ?? 0),
    input.expiresOn,
    input.isActive,
    input.maxUses,
  ]
}

export async function createDiscount(input: DiscountInput): Promise<void> {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    const { rows } = await client.query<{ id: number }>(
      `insert into discount_code
         (code, kind, value, amount_irt, amount_usdt, expires_on, is_active, max_uses)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      shape(input)
    )
    const id = rows[0]?.id
    if (id) await insertServices(client, id, input.serviceIds)
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function updateDiscount(id: number, input: DiscountInput): Promise<void> {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    await client.query(
      `update discount_code
          set code = $1, kind = $2, value = $3, amount_irt = $4, amount_usdt = $5,
              expires_on = $6, is_active = $7, max_uses = $8
        where id = $9`,
      [...shape(input), id]
    )
    await client.query('delete from discount_code_service where discount_code_id = $1', [
      id,
    ])
    await insertServices(client, id, input.serviceIds)
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteDiscount(id: number): Promise<void> {
  await getPool().query('delete from discount_code where id = $1', [id])
}

export async function toggleDiscount(id: number, isActive: boolean): Promise<void> {
  await getPool().query('update discount_code set is_active = $2 where id = $1', [
    id,
    isActive,
  ])
}

type Queryable = { query: (text: string, values?: unknown[]) => Promise<unknown> }

async function insertServices(client: Queryable, id: number, serviceIds: string[]) {
  for (const serviceId of serviceIds) {
    await client.query(
      'insert into discount_code_service (discount_code_id, service_id) values ($1, $2) on conflict do nothing',
      [id, serviceId]
    )
  }
}

/* ----------------------------- redemption ----------------------------- */

export type DiscountCheck =
  | { ok: true; discount: DiscountCode; amount: number; discounted: number }
  | { ok: false; reason: string }

/** The amount a code takes off, in the currency being paid. */
export function discountOff(
  discount: DiscountCode,
  base: number,
  currency: Currency
): number {
  if (discount.kind === 'percent') {
    return (base * (discount.percent ?? 0)) / 100
  }
  return (currency === 'IRT' ? discount.amountIrt : discount.amountUsdt) ?? 0
}

/**
 * Validates a code against a service and amount. Every rejection path returns
 * a Persian message the booking form can show directly.
 */
export async function checkDiscount(
  code: string,
  serviceId: string,
  amount: number,
  currency: Currency
): Promise<DiscountCheck> {
  const { rows } = await getPool().query<Row>(
    `${SELECT} where lower(d.code) = lower($1) group by d.id`,
    [code.trim()]
  )
  const row = rows[0]
  if (!row) return { ok: false, reason: 'کد تخفیف معتبر نیست.' }

  const discount = toDiscount(row)

  if (!discount.isActive) return { ok: false, reason: 'این کد تخفیف غیرفعال است.' }

  if (discount.expiresOn) {
    const today = new Date().toISOString().slice(0, 10)
    if (discount.expiresOn < today) {
      return { ok: false, reason: 'اعتبار این کد تخفیف به پایان رسیده است.' }
    }
  }

  if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
    return { ok: false, reason: 'ظرفیت استفاده از این کد تکمیل شده است.' }
  }

  if (discount.serviceIds.length > 0 && !discount.serviceIds.includes(serviceId)) {
    return { ok: false, reason: 'این کد برای نوع مشاوره انتخاب‌شده معتبر نیست.' }
  }

  // Never let a discount produce a negative total.
  const discounted = Math.max(0, amount - discountOff(discount, amount, currency))

  return { ok: true, discount, amount, discounted }
}

export async function consumeDiscount(id: number): Promise<void> {
  await getPool().query(
    'update discount_code set used_count = used_count + 1 where id = $1',
    [id]
  )
}
