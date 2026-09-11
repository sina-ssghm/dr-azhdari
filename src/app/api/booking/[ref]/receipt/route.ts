import { revalidatePath } from 'next/cache'
import { after, NextResponse } from 'next/server'
import { attachReceipt, getBooking } from '@/server/appointments'
import { isAllowedReceipt, isHeicReceipt, MAX_RECEIPT_BYTES } from '@/lib/receipt-limits'
import { receiptPath, saveReceipt } from '@/lib/receipts'
import { bookingSummary, notifyAdmin } from '@/server/notifications'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status })

/**
 * Receives a payment receipt for one booking.
 *
 * A route handler rather than a Server Action, for two reasons. Actions are
 * posted opaquely, so the browser cannot report how far the upload has got —
 * and on a phone connection a 5 MB photo is a long silence. Actions also cap
 * the request body at 1 MB by default, which quietly rejected most of the
 * receipts this form invites people to send.
 *
 * The booking reference is the authorisation: it is a uuid that only reaches
 * the person who made the booking.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params
  if (!UUID.test(ref)) return fail('رزرو یافت نشد.', 404)

  const booking = await getBooking(ref).catch(() => [])
  if (booking.length === 0) return fail('رزرو یافت نشد.', 404)

  let file: FormDataEntryValue | null
  try {
    file = (await request.formData()).get('receipt')
  } catch {
    return fail('فایل دریافت نشد. لطفاً دوباره تلاش کنید.', 400)
  }

  if (!(file instanceof File) || file.size === 0) {
    return fail('لطفاً فایل رسید را انتخاب کنید.', 400)
  }
  // Re-checked here, not only in the browser: the client-side check exists to
  // save the visitor a pointless upload, not to be the rule.
  if (file.size > MAX_RECEIPT_BYTES) {
    return fail('حجم فایل نباید بیشتر از ۵ مگابایت باشد.', 413)
  }
  if (!isAllowedReceipt(file)) {
    return fail(
      isHeicReceipt(file)
        ? 'عکس‌های HEIC آیفون پشتیبانی نمی‌شوند. لطفاً از عکس اسکرین‌شات بگیرید یا آن را با فرمت JPG ذخیره کنید.'
        : 'فقط تصویر (JPG، PNG، WebP) یا PDF پذیرفته می‌شود.',
      415
    )
  }

  let stored: string
  try {
    stored = await saveReceipt(file)
    await attachReceipt(ref, stored)
  } catch (error) {
    console.error('[booking] receipt upload failed', error)
    return fail('بارگذاری رسید ناموفق بود. لطفاً دوباره تلاش کنید.', 500)
  }

  revalidatePath(`/booking/${ref}/pay`)
  revalidatePath('/admin')
  revalidatePath('/admin/appointments')

  // The first alert of the whole flow: a booking without a receipt is not yet
  // anything to act on. The receipt travels with it.
  //
  // Deliberately after the response, not before it. The receipt is already
  // stored and the booking already updated by this point, so the visitor's
  // upload has succeeded no matter what Telegram or the push services do
  // next — and reaching them means an open-internet round trip that, from
  // Iran, can take a minute or never answer at all. Awaiting it here left the
  // uploader stuck at 100% on a receipt the practice had in fact received.
  after(async () => {
    await notifyAdmin({
      title: '🧾 رسید پرداخت جدید — در انتظار تأیید',
      body: await bookingSummary(ref),
      url: '/admin/appointments',
      phone: booking[0]?.phone,
      attachment: { path: receiptPath(stored), filename: stored },
    })
  })

  return NextResponse.json({ ok: true })
}
