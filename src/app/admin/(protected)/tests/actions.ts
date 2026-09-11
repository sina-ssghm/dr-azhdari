'use server'

import { revalidatePath } from 'next/cache'
import { TEST_IDS } from '@/content/tests'
import { toLatinDigits } from '@/lib/utils'
import { requireAdmin } from '@/server/session'
import {
  approveTestOrder,
  deleteTestOrder,
  rejectTestOrder,
  saveTestPrices,
  type TestPrice,
} from '@/server/tests'

export type PricesState = { error?: string; success?: boolean }

const digits = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') return 0
  const cleaned = toLatinDigits(value).replace(/[^\d.]/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export async function saveTestPricesAction(
  _previous: PricesState,
  formData: FormData
): Promise<PricesState> {
  await requireAdmin()

  const prices: TestPrice[] = TEST_IDS.map((testId) => ({
    testId,
    // Whole toman; a fractional rial is not a thing anybody types on purpose.
    priceIrt: Math.round(digits(formData.get(`irt_${testId}`))),
    priceUsdt: Math.round(digits(formData.get(`usdt_${testId}`)) * 100) / 100,
    enabled: formData.get(`enabled_${testId}`) === 'on',
  }))

  try {
    await saveTestPrices(prices)
  } catch (error) {
    console.error('[admin] saving test prices failed', error)
    return { error: 'ذخیره‌سازی ناموفق بود.' }
  }

  revalidatePath('/admin/tests')
  revalidatePath('/tests', 'layout')
  return { success: true }
}

/* -------------------------------- orders -------------------------------- */

function refresh() {
  revalidatePath('/admin')
  revalidatePath('/admin/tests')
}

/** Approves the payment and issues the link. Returns it so it can be copied. */
export async function approveOrderAction(orderRef: string): Promise<string | null> {
  await requireAdmin()
  const token = await approveTestOrder(orderRef)
  revalidatePath(`/tests/order/${orderRef}`)
  refresh()
  return token
}

export async function rejectOrderAction(orderRef: string): Promise<void> {
  await requireAdmin()
  await rejectTestOrder(orderRef)
  revalidatePath(`/tests/order/${orderRef}`)
  refresh()
}

export async function deleteOrderAction(orderRef: string): Promise<void> {
  await requireAdmin()
  await deleteTestOrder(orderRef)
  refresh()
}
