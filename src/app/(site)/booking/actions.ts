'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  createBooking,
  findFirstAvailableDate,
  getDaySlots,
  SlotTakenError,
  type DaySlots,
} from '@/server/appointments'
import { bookingLimits, bookingPage } from '@/content/booking-page'
import { addMonths } from '@/lib/jalali'
import { isPaymentId, PAYMENT_METHOD_IDS, priceFor } from '@/lib/payment'
import { isValidPhone } from '@/lib/phone'
import { timeToMinutes } from '@/lib/time'
import type { Currency } from '@/lib/utils'
import { checkDiscount, consumeDiscount } from '@/server/discounts'
import {
  BOOKABLE_SERVICE_IDS,
  getDurationPrice,
  serviceDurations,
} from '@/server/settings'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const clock = z.string().regex(/^\d{2}:\d{2}$/)
const serviceId = z.enum(BOOKABLE_SERVICE_IDS as unknown as [string, ...string[]])

export async function fetchSlotsAction(
  date: string,
  durationMin = 60
): Promise<DaySlots> {
  if (!isoDate.safeParse(date).success) return []
  try {
    return await getDaySlots(date, undefined, durationMin)
  } catch (error) {
    console.error('[booking] fetching slots failed', error)
    return []
  }
}

/** Soonest bookable date, so the picker never opens on an empty day. */
export async function firstAvailableDateAction(): Promise<string | null> {
  try {
    return await findFirstAvailableDate()
  } catch (error) {
    console.error('[booking] finding first available date failed', error)
    return null
  }
}

/* -------------------------------- quote -------------------------------- */

export type Quote = {
  base: number
  payable: number
  currency: Currency
  /** The applied code, echoed back so the panel can show it. */
  code: string | null
  discountError: string | null
  /** No tariff for this tier — the practice has not priced it yet. */
  notSet: boolean
}

/**
 * What this booking costs, computed the same way the submit does.
 *
 * The browser is never given the tariff table, so the number the visitor
 * confirms and the number that gets stored come from one place and cannot
 * drift apart.
 */
export async function quoteBookingAction(input: {
  serviceId: string
  durationMin: number
  sessions: number
  paymentMethod: string
  discountCode: string
}): Promise<Quote> {
  const method = isPaymentId(input.paymentMethod) ? input.paymentMethod : null
  const empty: Quote = {
    base: 0,
    payable: 0,
    currency: 'IRT',
    code: null,
    discountError: null,
    notSet: true,
  }
  if (!method || !serviceId.safeParse(input.serviceId).success) return empty

  try {
    const tier = await getDurationPrice(input.serviceId, input.durationMin)
    const { amount: unit, currency } = priceFor(tier, method)
    if (unit <= 0) return { ...empty, currency }

    const base = unit * Math.max(1, input.sessions)
    if (!input.discountCode) {
      return {
        base,
        payable: base,
        currency,
        code: null,
        discountError: null,
        notSet: false,
      }
    }

    const check = await checkDiscount(input.discountCode, input.serviceId, base, currency)
    if (!check.ok) {
      return {
        base,
        payable: base,
        currency,
        code: null,
        discountError: check.reason,
        notSet: false,
      }
    }

    return {
      base,
      payable: check.discounted,
      currency,
      code: check.discount.code,
      discountError: null,
      notSet: false,
    }
  } catch (error) {
    console.error('[booking] quoting failed', error)
    return empty
  }
}

/* -------------------------------- submit -------------------------------- */

/** One appointment: a day and a start time on it. Only these two vary. */
const bookingSlot = z.object({ date: isoDate, time: clock })
export type BookingSlot = z.infer<typeof bookingSlot>

const submitSchema = z.object({
  serviceId,
  durationMin: z.number().int().positive(),
  /**
   * One or more appointments, each its own day + time. The rest of the form
   * (person, service, payment) is shared across all of them.
   */
  slots: z
    .array(bookingSlot)
    .min(1, 'حداقل یک نوبت را انتخاب کنید.')
    .max(
      bookingLimits.maxAppointments,
      `حداکثر ${bookingLimits.maxAppointments} نوبت می‌توانید رزرو کنید.`
    ),
  fullName: z.string().trim().min(2, 'نام و نام خانوادگی را وارد کنید.'),
  // The same per-country rules the field enforces, so a number cannot pass in
  // the browser and be rejected here — or the reverse.
  phone: z.string().trim().refine(isValidPhone, 'شماره تماس معتبر نیست.'),
  email: z.string().trim().email('ایمیل نامعتبر است.').or(z.literal('')),
  notes: z.string().trim().max(1000),
  paymentMethod: z.enum(PAYMENT_METHOD_IDS),
  discountCode: z.string().trim(),
})

export type SubmitPayload = z.input<typeof submitSchema>

export type SubmitResult = { ok: true; ref: string } | { ok: false; error: string }

export async function submitBookingAction(payload: SubmitPayload): Promise<SubmitResult> {
  const parsed = submitSchema.safeParse(payload)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'اطلاعات کامل نیست.' }
  }

  const data = parsed.data

  if (!serviceDurations(data.serviceId).includes(data.durationMin)) {
    return { ok: false, error: 'مدت جلسه انتخاب‌شده معتبر نیست.' }
  }

  try {
    // Price comes from the database, per session, never from the client — and
    // is keyed on the rail, not the currency: an abroad card payment is also
    // in toman, so currency alone would charge it the domestic tariff.
    const price = await getDurationPrice(data.serviceId, data.durationMin)
    const { amount: unit, currency } = priceFor(price, data.paymentMethod)

    // A tier with no row prices at zero. Refuse rather than record a free
    // session that nobody will ever be asked to pay for.
    if (unit <= 0) return { ok: false, error: bookingPage.summary.notSet }

    const base = unit * data.slots.length

    let amount = base
    let discountId: number | null = null

    if (data.discountCode) {
      const check = await checkDiscount(data.discountCode, data.serviceId, base, currency)
      if (!check.ok) return { ok: false, error: check.reason }
      amount = check.discounted
      discountId = check.discount.id
    }

    // Every appointment must fall inside the booking window: not in the past,
    // not further out than the far bound. Rechecked here so a request that
    // bypasses the calendar cannot slip a date past it. The container runs
    // Asia/Tehran, so the local parts of `now` are the practice's own day.
    const now = new Date()
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const maxIso = addMonths(
      new Date(`${todayIso}T12:00:00Z`),
      bookingLimits.monthsAhead
    )
      .toISOString()
      .slice(0, 10)

    if (data.slots.some((s) => s.date < todayIso || s.date > maxIso)) {
      return {
        ok: false,
        error: `فقط می‌توانید نوبت‌هایی تا ${bookingLimits.monthsAhead} ماه آینده رزرو کنید.`,
      }
    }

    // Appointments are grouped by day: two on different days can never run into
    // each other, so overlap and availability are checked one day at a time.
    const byDate = new Map<string, string[]>()
    for (const slot of data.slots) {
      const list = byDate.get(slot.date) ?? []
      list.push(slot.time)
      byDate.set(slot.date, list)
    }

    for (const [date, times] of byDate) {
      // The chosen hours on a day must not run into each other. Rechecked on
      // the server so a request bypassing the picker cannot create an overlap;
      // identical times collapse to a zero gap and are caught here too.
      const starts = times.map(timeToMinutes).sort((a, b) => a - b)
      for (let i = 1; i < starts.length; i += 1) {
        if (starts[i]! - starts[i - 1]! < data.durationMin) {
          return {
            ok: false,
            error:
              'ساعت‌های انتخاب‌شده با یکدیگر هم‌پوشانی دارند. لطفاً ساعت‌های جدا از هم انتخاب کنید.',
          }
        }
      }

      // Re-check every requested slot; the database constraint is the final guard.
      const slots = await getDaySlots(date, undefined, data.durationMin)
      for (const time of times) {
        const slot = slots.find((s) => s.slot === time)
        if (!slot || slot.taken) {
          return {
            ok: false,
            error:
              'یکی از ساعت‌های انتخاب‌شده دیگر در دسترس نیست. لطفاً دوباره انتخاب کنید.',
          }
        }
      }
    }

    const ref = await createBooking({
      serviceId: data.serviceId,
      durationMin: data.durationMin,
      sessions: data.slots.map((slot) => ({
        scheduledOn: slot.date,
        scheduledAt: slot.time,
      })),
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      notes: data.notes || null,
      paymentMethod: data.paymentMethod,
      amount,
      currency,
      discountCode: data.discountCode || null,
    })

    if (discountId !== null) await consumeDiscount(discountId)

    // No notification here on purpose: a booking with no receipt is not yet
    // something to act on. The first alert comes when the receipt arrives.

    revalidatePath('/booking')
    revalidatePath('/admin/appointments')

    return { ok: true, ref }
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return {
        ok: false,
        error: 'یکی از ساعت‌ها هم‌زمان توسط فرد دیگری رزرو شد. لطفاً دوباره انتخاب کنید.',
      }
    }
    console.error('[booking] submit failed', error)
    return {
      ok: false,
      error: 'ثبت رزرو ممکن نشد. لطفاً دوباره تلاش کنید یا تماس بگیرید.',
    }
  }
}
