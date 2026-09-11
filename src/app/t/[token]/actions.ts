'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { findTest } from '@/content/tests'
import { formatPrice } from '@/lib/utils'
import { notifyAdmin } from '@/server/notifications'
import { saveTestProgress, submitTest } from '@/server/tests'

/**
 * Stores what has been answered so far.
 *
 * Fire-and-forget from the browser's point of view: seventy-five questions on
 * a phone is long enough that a dropped connection or a closed tab is a real
 * possibility, and losing the lot would be unforgivable.
 */
export async function saveProgressAction(
  token: string,
  answers: Record<string, number>
): Promise<void> {
  await saveTestProgress(token, answers)
}

export type SubmitState = { error?: string }

export async function submitTestAction(
  token: string,
  answers: Record<string, number>
): Promise<SubmitState> {
  const outcome = await submitTest(token, answers)

  if (!outcome.ok) {
    if (outcome.reason === 'incomplete') {
      return { error: 'هنوز به همه سؤال‌ها پاسخ نداده‌اید.' }
    }
    // 'already' is not an error worth showing: the page reload below lands on
    // the result, which is what the visitor wanted anyway.
    if (outcome.reason === 'already') {
      revalidatePath(`/t/${token}`)
      return {}
    }
    return { error: 'ثبت پاسخ‌ها ناموفق بود. لطفاً دوباره تلاش کنید.' }
  }

  const order = outcome.order
  const test = findTest(order.testId)

  revalidatePath(`/t/${token}`)
  revalidatePath('/admin/tests')

  after(async () => {
    const scales = (order.result?.scales ?? [])
      .map((scale) => `• ${scale.title}: ${scale.score} از ${scale.max}`)
      .join('\n')

    await notifyAdmin({
      title: '📝 آزمون آنلاین تکمیل شد',
      body: [
        `آزمون: ${test?.title ?? order.testId}`,
        `مراجع: ${order.fullName}`,
        `تماس: ${order.phone}`,
        order.result?.level ? `نتیجه: ${order.result.level}` : null,
        order.result
          ? `نمره کل: ${order.result.total} از ${order.result.totalMax}`
          : null,
        // The therapist is the only reader of a clinical profile, so the
        // scales travel with the message rather than waiting in the panel.
        scales ? `\n${scales}` : null,
        order.result?.safety ? `\n⚠️ هشدار: پاسخ به سؤال ایمنی مثبت بود.` : null,
        `\nمبلغ پرداختی: ${formatPrice(order.amount, order.currency)}`,
      ]
        .filter(Boolean)
        .join('\n'),
      url: '/admin/tests',
      phone: order.phone,
    })
  })

  return {}
}
