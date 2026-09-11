import { revalidatePath } from 'next/cache'
import { after, NextResponse } from 'next/server'
import { findTest } from '@/content/tests'
import { isAllowedReceipt, isHeicReceipt, MAX_RECEIPT_BYTES } from '@/lib/receipt-limits'
import { receiptPath, saveReceipt } from '@/lib/receipts'
import { formatPrice } from '@/lib/utils'
import { notifyAdmin } from '@/server/notifications'
import { attachTestReceipt, getOrderByRef } from '@/server/tests'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status })

/**
 * Receives the payment receipt for a test order.
 *
 * The twin of the booking receipt route, and deliberately so: same limits,
 * same uploader on the other end, same rule that the notification happens
 * after the response rather than in front of it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params
  if (!UUID.test(ref)) return fail('سفارش یافت نشد.', 404)

  const order = await getOrderByRef(ref).catch(() => null)
  if (!order) return fail('سفارش یافت نشد.', 404)
  // Nothing to review once it has been approved, and a rejected order needs a
  // conversation rather than another upload.
  if (order.paymentStatus === 'paid') return fail('این سفارش قبلاً تأیید شده است.', 409)

  let file: FormDataEntryValue | null
  try {
    file = (await request.formData()).get('receipt')
  } catch {
    return fail('فایل دریافت نشد. لطفاً دوباره تلاش کنید.', 400)
  }

  if (!(file instanceof File) || file.size === 0) {
    return fail('لطفاً فایل رسید را انتخاب کنید.', 400)
  }
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
    await attachTestReceipt(ref, stored)
  } catch (error) {
    console.error('[tests] receipt upload failed', error)
    return fail('بارگذاری رسید ناموفق بود. لطفاً دوباره تلاش کنید.', 500)
  }

  revalidatePath(`/tests/order/${ref}`)
  revalidatePath('/admin')
  revalidatePath('/admin/tests')

  const test = findTest(order.testId)
  after(async () => {
    await notifyAdmin({
      title: '🧾 رسید آزمون آنلاین — در انتظار تأیید',
      body: [
        `آزمون: ${test?.title ?? order.testId}`,
        `مراجع: ${order.fullName}`,
        `تماس: ${order.phone}`,
        `مبلغ: ${formatPrice(order.amount, order.currency)}`,
      ].join('\n'),
      url: '/admin/tests',
      phone: order.phone,
      attachment: { path: receiptPath(stored), filename: stored },
    })
  })

  return NextResponse.json({ ok: true })
}
