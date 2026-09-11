'use server'

import { revalidatePath } from 'next/cache'
import {
  saveSettings,
  type ContactSettings,
  type PaymentSettings,
  type SettingKey,
} from '@/server/settings'
import { requireAdmin } from '@/server/session'
import { toLatinDigits } from '@/lib/utils'

export type SettingsState = { error?: string; success?: boolean }

/** A Shetab card number. */
const CARD_DIGITS = 16
/** An Iranian IBAN is IR + 24 digits; only the digits are stored editable. */
const SHEBA_DIGITS = 24

/**
 * Persian numerals first, so a number typed on a Persian keyboard is accepted
 * rather than silently reduced to nothing by the digit filter.
 */
const digitsOnly = (value: string) => toLatinDigits(value).replace(/\D/g, '')

/**
 * Phones keep a leading `+`; card and sheba numbers cannot have one.
 *
 * `digitsOnly` was written for the 16- and 24-digit bank fields, and running
 * it on a phone turns the `+98…` that a `type="tel"` box invites into
 * `98917…` — a number with neither the international `+` nor the national
 * trunk `0`, which a dialer reads as local and fails to place. The footer's
 * `dialable` in `server/settings.ts` preserves `+` for exactly that reason,
 * so the write path has to agree with it. Only the leading one survives: a
 * `+` anywhere else is a typo, not a country code.
 */
const phoneInput = (value: string) =>
  toLatinDigits(value)
    .replace(/[^\d+]/g, '')
    .replace(/(?!^)\+/g, '')

/**
 * The footer sets the address on one line. A pasted address arrives with the
 * line breaks of wherever it was copied from and HTML collapses those to a
 * space when it renders, so normalising on the way in is what keeps the
 * stored value and the rendered value the same string. Punctuation is left
 * exactly as typed — it is the client's own.
 */
const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim()

export async function saveSettingsAction(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  await requireAdmin()

  const read = (key: SettingKey) => {
    const raw = formData.get(key)
    // Copy-pasted from a bank statement more often than typed.
    return typeof raw === 'string' ? raw.trim() : ''
  }

  const cardNumber = digitsOnly(read('card_number'))
  const sheba = digitsOnly(read('card_sheba'))

  // Empty is allowed — a practice taking only USDT never fills these in — but a
  // half-typed one is not: it would be shown to a visitor as where to send money.
  if (cardNumber && cardNumber.length !== CARD_DIGITS) {
    return { error: 'شماره کارت باید دقیقاً ۱۶ رقم باشد.' }
  }
  if (sheba && sheba.length !== SHEBA_DIGITS) {
    return { error: 'شماره شبا باید دقیقاً ۲۴ رقم باشد (بدون IR).' }
  }

  const botToken = read('telegram_bot_token').replace(/\s+/g, '')
  // Bot tokens look like 123456789:AA… — a shape check catches a pasted
  // username or a half-copied string before Telegram rejects it.
  if (botToken && !/^\d{6,}:[\w-]{30,}$/.test(botToken)) {
    return { error: 'توکن ربات تلگرام معتبر به نظر نمی‌رسد.' }
  }

  const phonePrimary = phoneInput(read('contact_phone_primary'))
  const phoneSecondary = phoneInput(read('contact_phone_secondary'))
  const phoneMobile = phoneInput(read('contact_phone_mobile'))
  const email = read('contact_email')
  const address = oneLine(read('contact_address'))

  // Empty is allowed everywhere here — the footer falls back to the shipped
  // value — but nonsense is not: these are printed on every page as links
  // that would dial or mail nowhere. A length check rather than
  // libphonenumber, because both shapes must pass: 09178069588 is a mobile
  // and 07136282576 is a Shiraz landline.
  for (const phone of [phonePrimary, phoneSecondary, phoneMobile]) {
    // Counted without the `+`, so the message stays true to what it says and a
    // lone `+` is rejected rather than stored as a one-character phone number.
    const length = phone.replace(/\D/g, '').length
    if (phone && (length < 8 || length > 15)) {
      return { error: 'شماره تماس باید بین ۸ تا ۱۵ رقم باشد.' }
    }
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'نشانی ایمیل معتبر به نظر نمی‌رسد.' }
  }
  // Rejected rather than truncated: a silently clipped street address is
  // worse than being told to shorten it.
  if (address.length > 220) {
    return { error: 'نشانی نباید بیشتر از ۲۲۰ نویسه باشد.' }
  }

  // Typed as PaymentSettings, not Partial: adding a payment field then fails
  // the build here instead of silently never being saved.
  const values: PaymentSettings & ContactSettings & { telegram_bot_token: string } = {
    telegram_bot_token: botToken,
    card_number: cardNumber,
    // Stored with the IR prefix re-attached: that is the form a visitor pastes
    // into a banking app, and what the payment page already renders and copies.
    card_sheba: sheba ? `IR${sheba}` : '',
    card_holder: read('card_holder'),
    usdt_address: read('usdt_address'),
    usdt_network: read('usdt_network').toUpperCase(),
    contact_phone_primary: phonePrimary,
    contact_phone_secondary: phoneSecondary,
    contact_phone_secondary_label: read('contact_phone_secondary_label'),
    contact_phone_mobile: phoneMobile,
    contact_phone_mobile_label: read('contact_phone_mobile_label'),
    contact_email: email,
    contact_clinic: read('contact_clinic'),
    contact_address: address,
  }

  try {
    await saveSettings(values)
  } catch (error) {
    console.error('[admin] saving settings failed', error)
    return { error: 'ذخیره‌سازی ناموفق بود.' }
  }

  revalidatePath('/admin/settings')
  // Payment details appear on every booking's payment page.
  revalidatePath('/booking', 'layout')
  // The contact details sit in the footer under the root layout, on every
  // page — including the five that were prerendered at build time with the
  // defaults from `content/site.ts` baked in.
  revalidatePath('/', 'layout')
  return { success: true }
}
