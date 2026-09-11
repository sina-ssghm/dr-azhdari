'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { PRICE_TIERS, saveDurationPrices } from '@/server/settings'
import { requireAdmin } from '@/server/session'

export type PricesState = { error?: string; success?: boolean }

// Accepts "2,500,000" as well as "2500000".
const amount = z
  .string()
  .trim()
  .transform((v) => Number(v.replace(/[,\s]/g, '')))
  .refine(
    (n) => Number.isFinite(n) && n >= 0,
    'مبلغ باید عددی بزرگ‌تر یا مساوی صفر باشد.'
  )

export async function savePricesAction(
  _previous: PricesState,
  formData: FormData
): Promise<PricesState> {
  await requireAdmin()

  try {
    const prices = PRICE_TIERS.map((tier) => {
      const suffix = `${tier.serviceId}_${tier.durationMin}`

      // Read strictly: a `?? '0'` fallback would turn a renamed field into a
      // silent save of zero, reported in green as success.
      const read = (key: string) => {
        const raw = formData.get(key)
        if (typeof raw !== 'string') throw new Error('فرم تعرفه‌ها ناقص ارسال شد.')
        const parsed = amount.safeParse(raw)
        if (!parsed.success) {
          throw new Error('مبالغ باید عدد معتبر و بزرگ‌تر یا مساوی صفر باشند.')
        }
        return parsed.data
      }

      return {
        serviceId: tier.serviceId,
        durationMin: tier.durationMin,
        priceIrt: read(`irt_${suffix}`),
        priceIrtAbroad: read(`irtAbroad_${suffix}`),
        priceUsdt: read(`usdt_${suffix}`),
      }
    })

    await saveDurationPrices(prices)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ذخیره‌سازی ناموفق بود.' }
  }

  revalidatePath('/admin/prices')
  revalidatePath('/booking')
  return { success: true }
}
