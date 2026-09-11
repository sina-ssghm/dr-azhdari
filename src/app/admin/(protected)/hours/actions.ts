'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { saveWorkingHours } from '@/server/settings'
import { requireAdmin } from '@/server/session'

export type HoursState = { error?: string; success?: boolean }

const time = z.string().regex(/^\d{2}:\d{2}$/, 'ساعت نامعتبر است.')

const span = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  starts: time,
  ends: time,
})

/**
 * The editor posts the whole week at once as JSON, so the schedule is replaced
 * atomically. Editing one day can never leave the table half-updated.
 */
export async function saveHoursAction(
  _previous: HoursState,
  formData: FormData
): Promise<HoursState> {
  await requireAdmin()

  const raw = formData.get('spans')
  if (typeof raw !== 'string') return { error: 'داده‌ای برای ذخیره ارسال نشد.' }

  let parsed: z.infer<typeof span>[]
  try {
    parsed = z.array(span).parse(JSON.parse(raw))
  } catch {
    return { error: 'بازه‌های زمانی نامعتبر هستند.' }
  }

  for (const item of parsed) {
    if (item.ends <= item.starts) {
      return { error: 'ساعت پایان باید بعد از ساعت شروع باشد.' }
    }
  }

  // Overlapping spans on the same day would generate duplicate slots.
  for (let i = 0; i < parsed.length; i += 1) {
    for (let j = i + 1; j < parsed.length; j += 1) {
      const a = parsed[i]!
      const b = parsed[j]!
      if (a.weekday === b.weekday && a.starts < b.ends && b.starts < a.ends) {
        return { error: 'بازه‌های یک روز نباید با هم هم‌پوشانی داشته باشند.' }
      }
    }
  }

  try {
    await saveWorkingHours(parsed)
  } catch (error) {
    console.error('[admin] saving hours failed', error)
    return { error: 'ذخیره‌سازی ناموفق بود.' }
  }

  revalidatePath('/admin/hours')
  revalidatePath('/booking')
  return { success: true }
}
