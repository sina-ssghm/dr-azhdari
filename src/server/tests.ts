import 'server-only'

import { randomBytes, randomUUID } from 'node:crypto'
import { findTest, TEST_IDS, TESTS } from '@/content/tests'
import { getPool } from '@/lib/db'
import {
  sanitiseAnswers,
  scoreTest,
  type Answers,
  type TestResult,
} from '@/lib/test-scoring'
import type { Currency } from '@/lib/utils'

/**
 * Orders for the online questionnaires.
 *
 * The instruments themselves are code; this module owns only what the practice
 * and its visitors generate — the prices, and one row per person who asked to
 * take a test.
 */

export type TestRegion = 'iran' | 'abroad'

export type TestPaymentStatus = 'unpaid' | 'pending_review' | 'paid' | 'rejected'

export type TestPrice = {
  testId: string
  priceIrt: number
  priceUsdt: number
  enabled: boolean
}

export type TestOrder = {
  id: number
  orderRef: string
  accessToken: string | null
  testId: string
  fullName: string
  phone: string
  email: string | null
  region: TestRegion
  amount: number
  currency: Currency
  paymentStatus: TestPaymentStatus
  receiptPath: string | null
  answers: Answers
  result: TestResult | null
  issuedAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

/* -------------------------------- prices -------------------------------- */

export async function getTestPrices(): Promise<TestPrice[]> {
  const { rows } = await getPool().query<{
    test_id: string
    price_irt: string
    price_usdt: string
    enabled: boolean
  }>('select test_id, price_irt, price_usdt, enabled from psy_test_price')

  const stored = new Map(rows.map((row) => [row.test_id, row]))
  // Driven by the code catalogue, not the table: a test added in code must
  // appear in the panel straight away rather than after someone remembers to
  // insert a row for it.
  return TESTS.map((test) => {
    const row = stored.get(test.id)
    return {
      testId: test.id,
      priceIrt: Number(row?.price_irt ?? 0),
      priceUsdt: Number(row?.price_usdt ?? 0),
      enabled: row?.enabled ?? true,
    }
  })
}

export async function saveTestPrices(prices: TestPrice[]): Promise<void> {
  const pool = getPool()
  for (const price of prices) {
    if (!TEST_IDS.includes(price.testId)) continue
    await pool.query(
      `insert into psy_test_price (test_id, price_irt, price_usdt, enabled, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (test_id) do update
         set price_irt = excluded.price_irt,
             price_usdt = excluded.price_usdt,
             enabled = excluded.enabled,
             updated_at = now()`,
      [price.testId, price.priceIrt, price.priceUsdt, price.enabled]
    )
  }
}

/** What one test costs where the visitor is. */
export function amountFor(price: TestPrice, region: TestRegion) {
  return region === 'iran'
    ? { amount: price.priceIrt, currency: 'IRT' as const }
    : { amount: price.priceUsdt, currency: 'USDT' as const }
}

/* -------------------------------- orders -------------------------------- */

const columns = `id, order_ref, access_token, test_id, full_name, phone, email,
  region, amount, currency, payment_status, receipt_path, answers, result,
  issued_at, started_at, completed_at, created_at`

type Row = {
  id: number
  order_ref: string
  access_token: string | null
  test_id: string
  full_name: string
  phone: string
  email: string | null
  region: TestRegion
  amount: string
  currency: Currency
  payment_status: TestPaymentStatus
  receipt_path: string | null
  answers: Answers | null
  result: TestResult | null
  issued_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

const toOrder = (row: Row): TestOrder => ({
  id: row.id,
  orderRef: row.order_ref,
  accessToken: row.access_token,
  testId: row.test_id,
  fullName: row.full_name,
  phone: row.phone,
  email: row.email,
  region: row.region,
  amount: Number(row.amount),
  currency: row.currency,
  paymentStatus: row.payment_status,
  receiptPath: row.receipt_path,
  answers: row.answers ?? {},
  result: row.result,
  issuedAt: row.issued_at,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  createdAt: row.created_at,
})

/**
 * The link a visitor is given.
 *
 * 160 bits of randomness in base32: long enough that guessing one is not a
 * thing anybody can do, short enough to send over WhatsApp without wrapping.
 */
function newAccessToken(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  return [...randomBytes(32)].map((byte) => alphabet[byte % alphabet.length]).join('')
}

export type NewTestOrder = {
  testId: string
  fullName: string
  phone: string
  email?: string | null
  region: TestRegion
}

/**
 * Records a request to take a test.
 *
 * A free test is approved on the spot — there is nothing to review — so it
 * comes back with its token already issued and the visitor goes straight in.
 */
export async function createTestOrder(input: NewTestOrder): Promise<TestOrder> {
  const test = findTest(input.testId)
  if (!test) throw new Error(`unknown test ${input.testId}`)

  const price = (await getTestPrices()).find((row) => row.testId === input.testId)
  if (!price || !price.enabled) throw new Error(`test ${input.testId} is not on sale`)

  const { amount, currency } = amountFor(price, input.region)
  const free = amount <= 0

  const { rows } = await getPool().query<Row>(
    `insert into test_order
       (order_ref, access_token, test_id, full_name, phone, email, region,
        amount, currency, payment_status, issued_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning ${columns}`,
    [
      randomUUID(),
      free ? newAccessToken() : null,
      input.testId,
      input.fullName,
      input.phone,
      input.email || null,
      input.region,
      amount,
      currency,
      free ? 'paid' : 'unpaid',
      free ? new Date() : null,
    ]
  )

  const row = rows[0]
  if (!row) throw new Error('order was not created')
  return toOrder(row)
}

export async function getOrderByRef(orderRef: string): Promise<TestOrder | null> {
  const { rows } = await getPool().query<Row>(
    `select ${columns} from test_order where order_ref = $1`,
    [orderRef]
  )
  const row = rows[0]
  return row ? toOrder(row) : null
}

export async function getOrderByToken(token: string): Promise<TestOrder | null> {
  const { rows } = await getPool().query<Row>(
    `select ${columns} from test_order where access_token = $1`,
    [token]
  )
  const row = rows[0]
  return row ? toOrder(row) : null
}

export async function attachTestReceipt(orderRef: string, file: string): Promise<void> {
  await getPool().query(
    `update test_order
        set receipt_path = $2, payment_status = 'pending_review', updated_at = now()
      where order_ref = $1`,
    [orderRef, file]
  )
}

/** Approves the payment and issues the link. Returns the token. */
export async function approveTestOrder(orderRef: string): Promise<string | null> {
  const { rows } = await getPool().query<{ access_token: string }>(
    `update test_order
        set payment_status = 'paid',
            -- Re-approving must not invalidate a link already sent out.
            access_token = coalesce(access_token, $2),
            issued_at = coalesce(issued_at, now()),
            updated_at = now()
      where order_ref = $1
      returning access_token`,
    [orderRef, newAccessToken()]
  )
  return rows[0]?.access_token ?? null
}

/**
 * Refuses the receipt.
 *
 * The token is withdrawn as well as the approval: a link that was issued and
 * then disputed must stop working, or refusing a payment means nothing.
 */
export async function rejectTestOrder(orderRef: string): Promise<void> {
  await getPool().query(
    `update test_order
        set payment_status = 'rejected', access_token = null, updated_at = now()
      where order_ref = $1 and completed_at is null`,
    [orderRef]
  )
}

export async function deleteTestOrder(orderRef: string): Promise<void> {
  await getPool().query('delete from test_order where order_ref = $1', [orderRef])
}

/**
 * Stores progress.
 *
 * Refuses once the test is submitted: the link becomes read-only at that
 * point, which is the whole reason it can safely be sent over a messenger.
 */
export async function saveTestProgress(token: string, input: unknown): Promise<boolean> {
  const order = await getOrderByToken(token)
  if (!order || order.completedAt) return false
  const test = findTest(order.testId)
  if (!test) return false

  await getPool().query(
    `update test_order
        set answers = $2::jsonb,
            started_at = coalesce(started_at, now()),
            updated_at = now()
      where access_token = $1 and completed_at is null`,
    [token, JSON.stringify(sanitiseAnswers(test, input))]
  )
  return true
}

export type SubmitOutcome =
  | { ok: true; order: TestOrder }
  | { ok: false; reason: 'unknown' | 'incomplete' | 'already' }

/**
 * Finishes the test.
 *
 * Scores on the server from the answers the server has, and writes the result
 * once. From here the link shows the outcome and nothing else.
 */
export async function submitTest(token: string, input: unknown): Promise<SubmitOutcome> {
  const order = await getOrderByToken(token)
  if (!order) return { ok: false, reason: 'unknown' }
  if (order.completedAt) return { ok: false, reason: 'already' }

  const test = findTest(order.testId)
  if (!test) return { ok: false, reason: 'unknown' }

  const answers = sanitiseAnswers(test, input)
  if (Object.keys(answers).length < test.questions.length) {
    return { ok: false, reason: 'incomplete' }
  }

  const result = scoreTest(test, answers)
  const { rows } = await getPool().query<Row>(
    `update test_order
        set answers = $2::jsonb, result = $3::jsonb,
            started_at = coalesce(started_at, now()),
            completed_at = now(), updated_at = now()
      where access_token = $1 and completed_at is null
      returning ${columns}`,
    [token, JSON.stringify(answers), JSON.stringify(result)]
  )

  const row = rows[0]
  // Lost a race with another tab submitting the same test.
  if (!row) return { ok: false, reason: 'already' }
  return { ok: true, order: toOrder(row) }
}

/* --------------------------------- admin --------------------------------- */

export const ORDER_GROUPS = {
  all: null,
  awaiting: ['pending_review'],
  unpaid: ['unpaid'],
  paid: ['paid'],
  rejected: ['rejected'],
} as const

export type OrderGroup = keyof typeof ORDER_GROUPS

export function isOrderGroup(value: unknown): value is OrderGroup {
  return typeof value === 'string' && value in ORDER_GROUPS
}

export async function listTestOrders(group: OrderGroup = 'all'): Promise<TestOrder[]> {
  const statuses = ORDER_GROUPS[group]
  const { rows } = await getPool().query<Row>(
    `select ${columns} from test_order
      ${statuses ? 'where payment_status = any($1)' : ''}
      order by created_at desc
      limit 300`,
    statuses ? [statuses] : []
  )
  return rows.map(toOrder)
}

/** Receipts sent in and not yet judged — the only queue that needs action. */
export async function countAwaitingTestReceipts(): Promise<number> {
  const { rows } = await getPool().query<{ n: string }>(
    `select count(*)::text as n from test_order where payment_status = 'pending_review'`
  )
  return Number(rows[0]?.n ?? 0)
}
