'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { NAME_MAX, QUOTE_MAX, QUOTE_MIN, testimonials } from '@/content/testimonials'
import { findCountry } from '@/lib/phone'
import { notifyAdmin } from '@/server/notifications'
import { submitTestimonial } from '@/server/testimonials'

export type CommentState = { error?: string; done?: boolean }

/**
 * Takes a comment from a visitor.
 *
 * Everything the browser checked is checked again here, because the browser is
 * not where the rule lives. The result is always `pending`: there is no code
 * path from this form to the homepage that does not pass the practice first.
 */
export async function submitCommentAction(
  _previous: CommentState,
  formData: FormData
): Promise<CommentState> {
  const read = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value.trim() : ''
  }

  // A field positioned off-screen and left empty by anyone who cannot see it.
  // Cheap, and it stops the indiscriminate form-filling bots without putting a
  // puzzle in front of somebody who just wants to say thank you.
  if (read('website')) return { done: true }

  const copy = testimonials.form.errors

  const name = read('name').slice(0, NAME_MAX)
  if (name.length < 2) return { error: copy.name }

  const quote = read('quote')
  if (quote.length < QUOTE_MIN) return { error: copy.quoteShort }
  if (quote.length > QUOTE_MAX) return { error: copy.quoteLong }

  // Anything unrecognised is stored as "not said" rather than as itself, so a
  // hand-crafted request cannot put arbitrary text where a country goes.
  const code = read('country').toUpperCase()
  const country = code ? findCountry(code) : undefined

  try {
    await submitTestimonial({
      name,
      countryCode: country?.code ?? null,
      quote,
    })
  } catch (error) {
    console.error('[testimonials] submission failed', error)
    return { error: copy.failed }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/testimonials')

  // After the response, never in front of it: the comment is already stored,
  // and reaching Telegram from Iran can take a minute or never answer at all.
  // The visitor's thank-you should not wait on it.
  after(async () => {
    await notifyAdmin({
      title: '💬 نظر جدید — در انتظار بررسی',
      body: [
        `نام: ${name}`,
        country ? `کشور: ${country.name}` : null,
        '',
        // The whole comment, so the decision can often be made from the
        // notification without opening the panel at all.
        quote,
      ]
        .filter((line) => line !== null)
        .join('\n'),
      url: '/admin/testimonials?tab=pending',
      name,
    })
  })

  return { done: true }
}
