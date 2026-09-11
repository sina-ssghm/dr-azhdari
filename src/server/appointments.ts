import 'server-only'

import { getPool } from '@/lib/db'
import type { PaymentId, StoredPaymentMethod } from '@/lib/payment'
import { intervalsOverlap, minutesToTime, timeToMinutes, type Interval } from '@/lib/time'
import type { Currency } from '@/server/discounts'
import { getWorkingHours } from '@/server/settings'

export const SESSION_MINUTES = 60

/**
 * Spacing between the start times offered inside a working span.
 *
 * Starts are anchored to the span's own start, not to the top of the hour: a
 * span beginning at 08:23 offers 08:23, 08:53, 09:23… The doctor's schedule
 * decides the grid, rather than the grid constraining the schedule.
 */
export const SLOT_STEP_MINUTES = 30

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

/**
 * Filter groups used by the appointments list.
 *
 * One group per status, deliberately disjoint: with a separate «در انتظار» tab,
 * a `reserved` that also counted pending rows would make the tab counts add up
 * to more than the total.
 */
export const STATUS_GROUPS = {
  all: null,
  pending: ['pending'],
  reserved: ['confirmed'],
  done: ['completed'],
  cancelled: ['cancelled'],
} as const

export type StatusGroup = keyof typeof STATUS_GROUPS

export function isStatusGroup(value: unknown): value is StatusGroup {
  return typeof value === 'string' && value in STATUS_GROUPS
}

export type Appointment = {
  id: number
  serviceId: string
  scheduledOn: string
  scheduledAt: string
  fullName: string
  phone: string
  email: string | null
  notes: string | null
  status: AppointmentStatus
  paymentMethod: StoredPaymentMethod | null
  paymentStatus: string
  amount: number | null
  currency: Currency | null
  discountCode: string | null
  createdBy: 'public' | 'admin'
  createdAt: string
  /** Groups the sessions paid for together. */
  bookingRef: string
  /** Stored filename of the uploaded receipt, if any. */
  receiptPath: string | null
  durationMin: number
}

/* ---------------------------- availability ---------------------------- */

/** 0 = Saturday, matching `working_hour.weekday` and `lib/jalali`. */
export function persianWeekdayOf(isoDate: string): number {
  return (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 1) % 7
}

export type DaySlots = { slot: string; taken: boolean }[]

/** Local "today" — the container runs Asia/Tehran, see docker-compose. */
function localToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * A weekday's spans as merged, sorted minute intervals.
 *
 * Touching spans are merged so a session may cross the seam between
 * 08:00–12:00 and 12:00–16:00 rather than being stranded at the boundary.
 */
function openIntervals(spans: { starts: string; ends: string }[]): Interval[] {
  const sorted = spans
    .map((span) => ({ from: timeToMinutes(span.starts), to: timeToMinutes(span.ends) }))
    .filter((interval) => interval.to > interval.from)
    .sort((a, b) => a.from - b.from)

  const merged: Interval[] = []
  for (const interval of sorted) {
    const last = merged[merged.length - 1]
    if (last && interval.from <= last.to) last.to = Math.max(last.to, interval.to)
    else merged.push({ ...interval })
  }
  return merged
}

/** Every start where a session of `duration` fits inside an open interval. */
function candidateStarts(intervals: Interval[], duration: number): number[] {
  const starts: number[] = []
  for (const interval of intervals) {
    for (let t = interval.from; t + duration <= interval.to; t += SLOT_STEP_MINUTES) {
      starts.push(t)
    }
  }
  return starts
}

/** What an existing appointment occupies. */
const bookedInterval = (start: number, duration: number): Interval => ({
  from: start,
  to: start + (duration || SESSION_MINUTES),
})

/**
 * Every slot the practice offers on a given date, flagged as taken or free.
 *
 * Slots are derived from the weekly spans rather than stored, so editing the
 * schedule immediately changes what visitors can book without a backfill.
 */
export async function getDaySlots(
  isoDate: string,
  /** When editing, the appointment's own cells must not count as taken. */
  excludeId?: number,
  durationMin: number = SESSION_MINUTES
): Promise<DaySlots> {
  const weekday = persianWeekdayOf(isoDate)
  const spans = (await getWorkingHours()).filter((h) => h.weekday === weekday)
  const intervals = openIntervals(spans)
  if (intervals.length === 0) return []

  const { rows } = await getPool().query<{ at: string; duration_min: number }>(
    `select to_char(scheduled_at, 'HH24:MI') as at, duration_min
       from appointment
      where scheduled_on = $1 and status <> 'cancelled'
        and ($2::int is null or id <> $2)`,
    [isoDate, excludeId ?? null]
  )

  // An existing session occupies a range, not a point: a 120-minute booking at
  // 09:00 blocks anything starting before 11:00, whatever minute it starts on.
  const busy = rows.map((row) => bookedInterval(timeToMinutes(row.at), row.duration_min))

  const isToday = isoDate === localToday()
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // Every offered start, flagged so the UI can show unavailable ones struck out.
  return candidateStarts(intervals, durationMin)
    .filter((start) => !isToday || start > nowMinutes)
    .map((start) => ({
      slot: minutesToTime(start),
      taken: busy.some((taken) =>
        intervalsOverlap({ from: start, to: start + durationMin }, taken)
      ),
    }))
}

/**
 * The soonest date with at least one free slot, or null.
 *
 * Without this the picker opens on today and can show an empty grid — a
 * visitor arriving in the afternoon, after the day's last slot, would think
 * there is no availability at all. Computed in one pass over the range rather
 * than a query per day.
 */
export async function findFirstAvailableDate(withinDays = 90): Promise<string | null> {
  const hours = await getWorkingHours()
  if (hours.length === 0) return null

  const byWeekday = new Map<number, { starts: string; ends: string }[]>()
  for (const hour of hours) {
    const list = byWeekday.get(hour.weekday) ?? []
    list.push(hour)
    byWeekday.set(hour.weekday, list)
  }

  const start = localToday()
  const end = new Date(`${start}T12:00:00Z`)
  end.setUTCDate(end.getUTCDate() + withinDays)
  const endIso = end.toISOString().slice(0, 10)

  const { rows } = await getPool().query<{ d: string; t: string; duration_min: number }>(
    `select scheduled_on::text as d, to_char(scheduled_at, 'HH24:MI') as t, duration_min
       from appointment
      where scheduled_on between $1 and $2 and status <> 'cancelled'`,
    [start, endIso]
  )

  const busy = new Map<string, Interval[]>()
  for (const row of rows) {
    const list = busy.get(row.d) ?? []
    list.push(bookedInterval(timeToMinutes(row.t), row.duration_min))
    busy.set(row.d, list)
  }

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  for (let i = 0; i < withinDays; i += 1) {
    const cursor = new Date(`${start}T12:00:00Z`)
    cursor.setUTCDate(cursor.getUTCDate() + i)
    const iso = cursor.toISOString().slice(0, 10)

    const spans = byWeekday.get(persianWeekdayOf(iso))
    if (!spans) continue

    const taken = busy.get(iso) ?? []

    // The shortest session is the easiest to fit, so it decides "is this day
    // usable at all" — a longer one may still need a different day.
    const free = candidateStarts(openIntervals(spans), SESSION_MINUTES).some(
      (from) =>
        (i > 0 || from > nowMinutes) &&
        !taken.some((booked) =>
          intervalsOverlap({ from, to: from + SESSION_MINUTES }, booked)
        )
    )
    if (free) return iso
  }

  return null
}

/** Which weekdays have any span at all — lets the calendar grey out closed days. */
export async function getOpenWeekdays(): Promise<number[]> {
  const hours = await getWorkingHours()
  return [...new Set(hours.map((h) => h.weekday))].sort()
}

/* ---------------------------- appointments ---------------------------- */

type Row = {
  id: number
  service_id: string
  scheduled_on: string
  scheduled_at: string
  full_name: string
  phone: string
  email: string | null
  notes: string | null
  status: AppointmentStatus
  payment_method: string | null
  payment_status: string
  amount: string | null
  currency: Currency | null
  discount_code: string | null
  created_by: 'public' | 'admin'
  created_at: string
  booking_ref: string
  receipt_path: string | null
  duration_min: number
}

const toAppointment = (r: Row): Appointment => ({
  id: r.id,
  serviceId: r.service_id,
  scheduledOn: r.scheduled_on,
  scheduledAt: r.scheduled_at,
  fullName: r.full_name,
  phone: r.phone,
  email: r.email,
  notes: r.notes,
  status: r.status,
  paymentMethod: r.payment_method as StoredPaymentMethod | null,
  paymentStatus: r.payment_status,
  amount: r.amount === null ? null : Number(r.amount),
  currency: r.currency,
  discountCode: r.discount_code,
  createdBy: r.created_by,
  createdAt: r.created_at,
  bookingRef: r.booking_ref,
  receiptPath: r.receipt_path,
  durationMin: r.duration_min,
})

const SELECT = `
  select id, service_id, scheduled_on::text, to_char(scheduled_at, 'HH24:MI') as scheduled_at,
         full_name, phone, email, notes, status, payment_method, payment_status,
         amount, currency, discount_code, created_by, created_at::text,
         booking_ref::text, receipt_path, duration_min
    from appointment
`

export const PAGE_SIZE = 15

export type AppointmentFilters = {
  group?: StatusGroup
  /** Matches name or phone, case-insensitively. */
  search?: string
  /** Inclusive ISO date bounds. */
  from?: string
  to?: string
}

/**
 * Builds the shared WHERE clause. Everything is parameterised — the search
 * term reaches the database as a bound value, never as concatenated SQL.
 */
function buildFilter(filters: AppointmentFilters, includeStatus = true) {
  const conditions: string[] = []
  const values: unknown[] = []

  const statuses = includeStatus ? STATUS_GROUPS[filters.group ?? 'all'] : null
  if (statuses) {
    values.push(statuses)
    conditions.push(`status = any($${values.length})`)
  }

  if (filters.search) {
    values.push(`%${filters.search}%`)
    const term = values.length

    // Numbers are stored in E.164 (+989123456789) but people search for them
    // the way they write them (09123456789), so the trunk zero is tried both
    // ways. Non-numeric searches are unaffected — the second pattern is only
    // built when the term actually starts with one.
    values.push(`%${filters.search.replace(/^0+/, '')}%`)
    const trimmed = values.length

    conditions.push(
      `(full_name ilike $${term} or phone ilike $${term} or phone ilike $${trimmed})`
    )
  }

  if (filters.from) {
    values.push(filters.from)
    conditions.push(`scheduled_on >= $${values.length}`)
  }

  if (filters.to) {
    values.push(filters.to)
    conditions.push(`scheduled_on <= $${values.length}`)
  }

  return {
    where: conditions.length ? `where ${conditions.join(' and ')}` : '',
    values,
  }
}

export type AppointmentPage = {
  rows: Appointment[]
  total: number
  page: number
  pageCount: number
}

export async function listAppointments(
  filters: AppointmentFilters = {},
  page = 1,
  perPage = PAGE_SIZE
): Promise<AppointmentPage> {
  const { where, values } = buildFilter(filters)

  const counted = await getPool().query<{ n: string }>(
    `select count(*)::text as n from appointment ${where}`,
    values
  )
  const total = Number(counted.rows[0]?.n ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / perPage))
  // Clamp: a stale ?page= in the URL must not render an empty list.
  const safePage = Math.min(Math.max(1, page), pageCount)

  const { rows } = await getPool().query<Row>(
    `${SELECT} ${where}
     order by scheduled_on desc, scheduled_at desc
     limit $${values.length + 1} offset $${values.length + 2}`,
    [...values, perPage, (safePage - 1) * perPage]
  )

  return { rows: rows.map(toAppointment), total, page: safePage, pageCount }
}

/**
 * The soonest confirmed appointments, earliest first.
 *
 * Confirmed only: this is the "what is actually happening next" panel, and a
 * pending booking is one whose payment has not cleared — it may never happen.
 * Those are chased from the waiting-receipts list above it instead.
 *
 * Deliberately ordered ascending — the main list shows newest first, but a
 * "what's next" panel wants the nearest date at the top.
 */
export async function listUpcomingAppointments(limit = 5): Promise<Appointment[]> {
  const today = localToday()
  const { rows } = await getPool().query<Row>(
    `${SELECT}
      where scheduled_on >= $1 and status = 'confirmed'
      order by scheduled_on asc, scheduled_at asc
      limit $2`,
    [today, limit]
  )
  return rows.map(toAppointment)
}

/**
 * Bookings whose receipt has been uploaded but not yet checked.
 *
 * One entry per booking rather than per session: someone who booked three
 * hours paid once and uploaded one receipt, so three identical rows demanding
 * attention would be three times the work for one decision.
 */
export async function listAwaitingPayment(limit = 20): Promise<Appointment[]> {
  const { rows } = await getPool().query<Row>(
    `select * from (
       select distinct on (booking_ref)
              id, service_id, scheduled_on::text, to_char(scheduled_at, 'HH24:MI') as scheduled_at,
              full_name, phone, email, notes, status, payment_method, payment_status,
              amount, currency, discount_code, created_by, created_at::text,
              booking_ref::text, receipt_path, duration_min
         from appointment
        where payment_status = 'pending_review' and status <> 'cancelled'
        order by booking_ref, scheduled_on, scheduled_at
     ) booking
     order by created_at asc
     limit $1`,
    [limit]
  )
  return rows.map(toAppointment)
}

/**
 * Counts per tab, respecting the search and date filters so the numbers match
 * what each tab would actually show.
 */
export async function countAppointmentsByGroup(
  filters: AppointmentFilters = {}
): Promise<Record<StatusGroup, number>> {
  const { where, values } = buildFilter(filters, false)

  const { rows } = await getPool().query<{ status: AppointmentStatus; n: string }>(
    `select status, count(*)::text as n from appointment ${where} group by status`,
    values
  )

  // Derived from the groups rather than written out, so adding one cannot
  // leave a tab silently counting zero.
  const counts = Object.fromEntries(
    Object.keys(STATUS_GROUPS).map((group) => [group, 0])
  ) as Record<StatusGroup, number>

  for (const row of rows) {
    const n = Number(row.n)
    counts.all += n
    for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
      if (statuses?.includes(row.status as never)) {
        counts[group as Exclude<StatusGroup, 'all'>] += n
      }
    }
  }
  return counts
}

export type NewAppointment = {
  serviceId: string
  scheduledOn: string
  scheduledAt: string
  /**
   * How long the session runs. Not optional: the overlap constraint is built
   * from it, so letting it fall back to the column default would record a
   * 120-minute hypnotherapy session as reserving only its first hour.
   */
  durationMin: number
  fullName: string
  phone: string
  email?: string | null
  notes?: string | null
  paymentMethod?: StoredPaymentMethod | null
  paymentStatus?: 'unpaid' | 'paid' | 'waived'
  amount?: number | null
  currency?: Currency | null
  discountCode?: string | null
  createdBy: 'public' | 'admin'
  status?: AppointmentStatus
}

export class SlotTakenError extends Error {
  constructor() {
    super('SLOT_TAKEN')
  }
}

/**
 * Did the database refuse this write because the time is already spoken for?
 *
 * Two guards can fire: `23505` from the unique index on an identical start
 * time, and `23P01` from the exclusion constraint on a session that *overlaps*
 * an existing one without starting at the same minute. The second is the one
 * that matters — with 90- and 120-minute sessions on arbitrary start times,
 * most real clashes are overlaps rather than exact collisions.
 */
function isSlotConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  return error.code === '23505' || error.code === '23P01'
}

export async function createAppointment(input: NewAppointment): Promise<number> {
  try {
    const { rows } = await getPool().query<{ id: number }>(
      `insert into appointment
         (service_id, scheduled_on, scheduled_at, duration_min, full_name, phone, email, notes,
          status, payment_method, payment_status, amount, currency, discount_code, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       returning id`,
      [
        input.serviceId,
        input.scheduledOn,
        input.scheduledAt,
        input.durationMin,
        input.fullName,
        input.phone,
        input.email ?? null,
        input.notes ?? null,
        input.status ?? 'pending',
        input.paymentMethod ?? null,
        input.paymentStatus ?? 'unpaid',
        input.amount ?? null,
        input.currency ?? null,
        input.discountCode ?? null,
        input.createdBy,
      ]
    )
    return rows[0]?.id ?? 0
  } catch (error) {
    // Two people can race for the same time; the database decides, and the
    // loser gets a clean error rather than a silent double-booking.
    if (isSlotConflict(error)) throw new SlotTakenError()
    throw error
  }
}

/* ------------------------------- bookings ------------------------------ */

export type BookingSession = { scheduledOn: string; scheduledAt: string }

export type NewBooking = {
  serviceId: string
  durationMin: number
  sessions: BookingSession[]
  fullName: string
  phone: string
  email?: string | null
  notes?: string | null
  paymentMethod: PaymentId
  amount: number
  currency: Currency
  discountCode?: string | null
}

/**
 * Creates every session of a booking in one transaction and returns the
 * shared reference. All-or-nothing: if the second of three slots was taken
 * in the meantime, the whole booking is rolled back rather than leaving the
 * visitor with a partial reservation they have already been quoted for.
 */
export async function createBooking(input: NewBooking): Promise<string> {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    const { rows } = await client.query<{ booking_ref: string }>(
      'select gen_random_uuid() as booking_ref'
    )
    const ref = rows[0]!.booking_ref

    for (const session of input.sessions) {
      await client.query(
        `insert into appointment
           (booking_ref, service_id, scheduled_on, scheduled_at, duration_min,
            full_name, phone, email, notes, status, payment_method, payment_status,
            amount, currency, discount_code, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,'unpaid',$11,$12,$13,'public')`,
        [
          ref,
          input.serviceId,
          session.scheduledOn,
          session.scheduledAt,
          input.durationMin,
          input.fullName,
          input.phone,
          input.email ?? null,
          input.notes ?? null,
          input.paymentMethod,
          // The quoted total belongs to the booking, so it is recorded once on
          // the first session and left null on the rest.
          session === input.sessions[0] ? input.amount : null,
          input.currency,
          input.discountCode ?? null,
        ]
      )
    }

    await client.query('commit')
    return ref
  } catch (error) {
    await client.query('rollback')
    if (isSlotConflict(error)) throw new SlotTakenError()
    throw error
  } finally {
    client.release()
  }
}

export async function getBooking(ref: string): Promise<Appointment[]> {
  const { rows } = await getPool().query<Row>(
    `${SELECT} where booking_ref = $1 order by scheduled_on, scheduled_at`,
    [ref]
  )
  return rows.map(toAppointment)
}

/** Marks every session of a booking as awaiting review, with its receipt. */
export async function attachReceipt(ref: string, path: string): Promise<void> {
  await getPool().query(
    `update appointment
        set receipt_path = $2, payment_status = 'pending_review'
      where booking_ref = $1`,
    [ref, path]
  )
}

export async function setBookingPayment(
  ref: string,
  paymentStatus: 'unpaid' | 'pending_review' | 'paid',
  /**
   * What the appointments themselves become. Omit to leave them alone.
   *
   * Rejecting a receipt passes 'cancelled' — a payment the practice refused
   * means the booking does not stand, and the hour goes back on sale.
   * Confirming passes 'confirmed', which reinstates a booking cancelled that
   * way. Reinstating is safe to allow: the overlap constraint refuses the whole
   * update if any of its hours have been given away since, and the caller turns
   * that into a message rather than a silent no-op.
   */
  nextStatus?: 'confirmed' | 'pending' | 'cancelled'
): Promise<void> {
  try {
    await getPool().query(
      `update appointment
          set payment_status = $2,
              status = coalesce($3::text, status)
        where booking_ref = $1`,
      [ref, paymentStatus, nextStatus ?? null]
    )
  } catch (error) {
    if (isSlotConflict(error)) throw new SlotTakenError()
    throw error
  }
}

export type AppointmentEdit = {
  serviceId: string
  scheduledOn: string
  scheduledAt: string
  durationMin: number
  fullName: string
  phone: string
  email?: string | null
  notes?: string | null
}

export async function updateAppointment(
  id: number,
  input: AppointmentEdit
): Promise<void> {
  try {
    await getPool().query(
      `update appointment
          set service_id = $2, scheduled_on = $3, scheduled_at = $4, duration_min = $5,
              full_name = $6, phone = $7, email = $8, notes = $9
        where id = $1`,
      [
        id,
        input.serviceId,
        input.scheduledOn,
        input.scheduledAt,
        input.durationMin,
        input.fullName,
        input.phone,
        input.email ?? null,
        input.notes ?? null,
      ]
    )
  } catch (error) {
    // Moving onto time another appointment already holds.
    if (isSlotConflict(error)) throw new SlotTakenError()
    throw error
  }
}

export async function getAppointment(id: number): Promise<Appointment | null> {
  const { rows } = await getPool().query<Row>(`${SELECT} where id = $1`, [id])
  const row = rows[0]
  return row ? toAppointment(row) : null
}

export async function setAppointmentStatus(
  id: number,
  status: AppointmentStatus
): Promise<void> {
  try {
    await getPool().query('update appointment set status = $2 where id = $1', [
      id,
      status,
    ])
  } catch (error) {
    // Bringing a cancelled appointment back puts it inside the constraint's
    // scope again, and its old time may have been given away since.
    if (isSlotConflict(error)) throw new SlotTakenError()
    throw error
  }
}

export async function setPaymentStatus(
  id: number,
  paymentStatus: 'unpaid' | 'paid' | 'waived'
): Promise<void> {
  await getPool().query('update appointment set payment_status = $2 where id = $1', [
    id,
    paymentStatus,
  ])
}

export async function deleteAppointment(id: number): Promise<void> {
  await getPool().query('delete from appointment where id = $1', [id])
}
