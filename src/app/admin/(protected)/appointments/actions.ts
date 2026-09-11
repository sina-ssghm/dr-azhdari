'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { z } from 'zod'
import {
  createAppointment,
  deleteAppointment,
  getBooking,
  getDaySlots,
  setAppointmentStatus,
  setBookingPayment,
  SlotTakenError,
  updateAppointment,
} from '@/server/appointments'
import { bookingSummary, notifyAdmin } from '@/server/notifications'
import {
  BOOKABLE_SERVICE_IDS,
  LEGACY_DURATIONS,
  serviceDurations,
} from '@/server/settings'
import { requireAdmin } from '@/server/session'

export type AppointmentState = { error?: string; success?: boolean }

const schema = z.object({
  serviceId: z.enum(BOOKABLE_SERVICE_IDS as unknown as [string, ...string[]]),
  scheduledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ نامعتبر است.'),
  scheduledAt: z.string().regex(/^\d{2}:\d{2}$/, 'ساعت نامعتبر است.'),
  durationMin: z.coerce.number().int().positive(),
  fullName: z.string().trim().min(2, 'نام را وارد کنید.'),
  phone: z.string().trim().min(7, 'شماره تماس را وارد کنید.'),
  email: z.string().trim().email('ایمیل نامعتبر است.').optional().or(z.literal('')),
  notes: z.string().trim().optional(),
})

/**
 * New appointments must use a length the service currently offers — the
 * duration decides how much of the day is reserved.
 */
const createSchema = schema.refine(
  (data) => serviceDurations(data.serviceId).includes(data.durationMin),
  { message: 'مدت جلسه با نوع مشاوره همخوانی ندارد.', path: ['durationMin'] }
)

/**
 * Edits are looser: hypnotherapy sessions booked when it ran 90 or 120 minutes
 * still exist, and rejecting their stored length would make those rows
 * uneditable — the admin could not even correct a phone number.
 */
const updateSchema = schema.refine(
  (data) => (LEGACY_DURATIONS as readonly number[]).includes(data.durationMin),
  { message: 'مدت جلسه معتبر نیست.', path: ['durationMin'] }
)

const readForm = (formData: FormData) => ({
  serviceId: formData.get('serviceId'),
  scheduledOn: formData.get('scheduledOn'),
  scheduledAt: formData.get('scheduledAt'),
  durationMin: formData.get('durationMin'),
  fullName: formData.get('fullName'),
  phone: formData.get('phone'),
  email: formData.get('email') ?? '',
  notes: formData.get('notes') ?? '',
})

/**
 * Admin-created appointments skip payment entirely: the practice books these
 * by phone or in person, so they are marked confirmed and payment-waived.
 */
export async function createAppointmentAction(
  _previous: AppointmentState,
  formData: FormData
): Promise<AppointmentState> {
  await requireAdmin()

  const parsed = createSchema.safeParse(readForm(formData))

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'اطلاعات وارد شده معتبر نیست.' }
  }

  const data = parsed.data

  try {
    await createAppointment({
      serviceId: data.serviceId,
      scheduledOn: data.scheduledOn,
      scheduledAt: data.scheduledAt,
      durationMin: data.durationMin,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      notes: data.notes || null,
      status: 'confirmed',
      paymentMethod: 'none',
      paymentStatus: 'waived',
      createdBy: 'admin',
    })
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return { error: 'این ساعت قبلاً رزرو شده است. ساعت دیگری انتخاب کنید.' }
    }
    console.error('[admin] creating appointment failed', error)
    return { error: 'ثبت نوبت ناموفق بود.' }
  }

  revalidatePath('/admin/appointments')
  revalidatePath('/booking')
  return { success: true }
}

const STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'] as const

const TAKEN = 'این ساعت در این فاصله قبلاً رزرو شده است.'

/**
 * Called directly from client buttons, so the arguments are plain values and a
 * returned string is the failure message <ActionButton> shows.
 */
export async function setStatusAction(
  id: number,
  status: string
): Promise<string | void> {
  await requireAdmin()
  if (Number.isInteger(id) && (STATUSES as readonly string[]).includes(status)) {
    try {
      await setAppointmentStatus(id, status as (typeof STATUSES)[number])
    } catch (error) {
      // Un-cancelling puts the appointment back inside the overlap constraint,
      // and its time may have been given to someone else in the meantime.
      if (error instanceof SlotTakenError) return TAKEN
      console.error('[admin] changing status failed', error)
      return 'تغییر وضعیت نوبت ناموفق بود.'
    }
  }
  revalidatePath('/admin/appointments')
  revalidatePath('/booking')
}

/**
 * Confirms a payment for the whole booking, not just one session — a visitor
 * who booked three hours paid once, so all three become confirmed together.
 */
export async function confirmPaymentAction(bookingRef: string): Promise<string | void> {
  await requireAdmin()
  try {
    await setBookingPayment(bookingRef, 'paid', 'confirmed')
  } catch (error) {
    if (error instanceof SlotTakenError) return TAKEN
    console.error('[admin] confirming payment failed', error)
    return 'تأیید پرداخت ناموفق بود.'
  }

  revalidatePath('/admin')
  revalidatePath('/admin/appointments')
  revalidatePath('/booking')

  // The whole reservation, so the confirmation is a record in its own right
  // rather than something that has to be cross-referenced with the panel.
  //
  // After the response, for the same reason the receipt upload sends after
  // its own: the payment is already confirmed, and Telegram being slow should
  // not leave the panel's button spinning on work that is already done.
  after(async () => {
    const booking = await getBooking(bookingRef).catch(() => [])
    await notifyAdmin({
      title: '✅ پرداخت تأیید شد — رزرو نهایی شد',
      body: await bookingSummary(bookingRef),
      url: '/admin/appointments',
      phone: booking[0]?.phone,
    })
  })
}

/**
 * Refuses the receipt and cancels the booking.
 *
 * A payment the practice would not accept means the booking does not stand, so
 * the hours are released rather than left held by someone who has not paid.
 * Reversible: confirming the payment afterwards reinstates it, unless one of
 * its hours has been taken in the meantime.
 */
export async function rejectPaymentAction(bookingRef: string): Promise<string | void> {
  await requireAdmin()
  try {
    await setBookingPayment(bookingRef, 'unpaid', 'cancelled')
  } catch (error) {
    console.error('[admin] rejecting receipt failed', error)
    return 'رد رسید ناموفق بود.'
  }
  revalidatePath('/admin')
  revalidatePath('/admin/appointments')
  revalidatePath('/booking')
}

export async function deleteAppointmentAction(id: number): Promise<void> {
  await requireAdmin()
  if (Number.isInteger(id)) await deleteAppointment(id)
  revalidatePath('/admin/appointments')
  revalidatePath('/booking')
}

/**
 * Slots for a date. `excludeId` keeps an appointment's own time selectable
 * while it is being edited, instead of showing it as taken by itself.
 */
export async function slotsForDateAction(
  isoDate: string,
  excludeId?: number,
  /** Without this a 120-minute session is offered starts that only fit 60. */
  durationMin?: number
): Promise<{ slot: string; taken: boolean }[]> {
  await requireAdmin()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return []
  return getDaySlots(isoDate, excludeId, durationMin)
}

/** Edits an existing appointment. Status and payment are handled separately. */
export async function updateAppointmentAction(
  id: number,
  _previous: AppointmentState,
  formData: FormData
): Promise<AppointmentState> {
  await requireAdmin()

  const parsed = updateSchema.safeParse(readForm(formData))

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'اطلاعات وارد شده معتبر نیست.' }
  }

  const data = parsed.data

  try {
    await updateAppointment(id, {
      serviceId: data.serviceId,
      scheduledOn: data.scheduledOn,
      scheduledAt: data.scheduledAt,
      durationMin: data.durationMin,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      notes: data.notes || null,
    })
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return { error: 'این ساعت قبلاً رزرو شده است. ساعت دیگری انتخاب کنید.' }
    }
    console.error('[admin] updating appointment failed', error)
    return { error: 'ذخیره تغییرات ناموفق بود.' }
  }

  revalidatePath('/admin/appointments')
  revalidatePath('/booking')
  return { success: true }
}
