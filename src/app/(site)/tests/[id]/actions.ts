'use server'

import { redirect } from 'next/navigation'
import { findTest } from '@/content/tests'
import { isValidPhone } from '@/lib/phone'
import { createTestOrder, getTestPrices } from '@/server/tests'

export type RequestState = { error?: string }

/**
 * Records a request to take a test and sends the visitor where they need to go.
 *
 * A free test needs no payment step, so it comes back already approved and the
 * visitor goes straight to their link. A paid one goes to the payment page.
 */
export async function requestTestAction(
  _previous: RequestState,
  formData: FormData
): Promise<RequestState> {
  const read = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value.trim() : ''
  }

  const testId = read('testId')
  const test = findTest(testId)
  if (!test) return { error: 'این آزمون یافت نشد.' }

  const price = (await getTestPrices()).find((row) => row.testId === testId)
  if (!price || !price.enabled) {
    return { error: 'این آزمون در حال حاضر در دسترس نیست.' }
  }

  const fullName = read('fullName')
  if (fullName.length < 3) return { error: 'نام و نام خانوادگی خود را وارد کنید.' }

  const region = read('region') === 'abroad' ? 'abroad' : 'iran'

  // Arrives as E.164 from the country picker, and is re-checked here: the link
  // to the test is delivered by hand to this number, so a number that cannot be
  // called makes the whole order worthless.
  const phone = read('phone')
  if (!isValidPhone(phone)) return { error: 'شماره تماس معتبر نیست.' }

  const email = read('email')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'ایمیل معتبر نیست.' }
  }

  let order
  try {
    order = await createTestOrder({
      testId,
      fullName,
      phone,
      email,
      region,
    })
  } catch (error) {
    console.error('[tests] creating an order failed', error)
    return { error: 'ثبت درخواست ناموفق بود. لطفاً دوباره تلاش کنید.' }
  }

  // redirect() throws, so it must sit outside the try above.
  redirect(
    order.accessToken ? `/t/${order.accessToken}` : `/tests/order/${order.orderRef}`
  )
}
