'use server'

import { revalidatePath } from 'next/cache'
import { NAME_MAX, QUOTE_MAX, QUOTE_MIN } from '@/content/testimonials'
import { findCountry } from '@/lib/phone'
import { requireAdmin } from '@/server/session'
import {
  deleteTestimonial,
  setTestimonialStatus,
  updateTestimonial,
  type TestimonialStatus,
} from '@/server/testimonials'

/** Approving or hiding a comment changes what the homepage shows. */
function refresh() {
  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/testimonials')
}

export async function setStatusAction(
  id: number,
  status: TestimonialStatus
): Promise<void> {
  await requireAdmin()
  await setTestimonialStatus(id, status)
  refresh()
}

export async function deleteTestimonialAction(id: number): Promise<void> {
  await requireAdmin()
  await deleteTestimonial(id)
  refresh()
}

export type EditState = { error?: string; success?: boolean }

export async function editTestimonialAction(
  _previous: EditState,
  formData: FormData
): Promise<EditState> {
  await requireAdmin()

  const read = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value.trim() : ''
  }

  const id = Number(read('id'))
  if (!Number.isInteger(id) || id <= 0) return { error: 'نظر یافت نشد.' }

  const name = read('name').slice(0, NAME_MAX)
  if (name.length < 2) return { error: 'نام را وارد کنید.' }

  const quote = read('quote')
  if (quote.length < QUOTE_MIN) return { error: `متن نظر خیلی کوتاه است.` }
  if (quote.length > QUOTE_MAX) return { error: 'متن نظر خیلی بلند است.' }

  const code = read('country').toUpperCase()
  const country = code ? findCountry(code) : undefined

  try {
    await updateTestimonial(id, { name, countryCode: country?.code ?? null, quote })
  } catch (error) {
    console.error('[admin] editing a testimonial failed', error)
    return { error: 'ذخیره‌سازی ناموفق بود.' }
  }

  refresh()
  return { success: true }
}
