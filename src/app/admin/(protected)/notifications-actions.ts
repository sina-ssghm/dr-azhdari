'use server'

import { revalidatePath } from 'next/cache'
import {
  confirmPairing,
  createPairingCode,
  getPushPublicKey,
  notificationStatus,
  notifyAdmin,
  removePushSubscription,
  removeTelegramRecipient,
  savePushSubscription,
  type TelegramRecipient,
} from '@/server/notifications'
import { getSettings, saveSettings } from '@/server/settings'
import { requireAdmin } from '@/server/session'

export type NotifyState = {
  devices: number
  telegramReady: boolean
  recipients: TelegramRecipient[]
}

export async function notificationStatusAction(): Promise<NotifyState> {
  await requireAdmin()
  return notificationStatus()
}

/** The VAPID public key the browser needs to subscribe. */
export async function pushKeyAction(): Promise<string> {
  await requireAdmin()
  return getPushPublicKey()
}

export async function subscribePushAction(input: {
  endpoint: string
  p256dh: string
  auth: string
  label?: string
}): Promise<void> {
  await requireAdmin()
  await savePushSubscription(input)
  revalidatePath('/admin')
}

export async function unsubscribePushAction(endpoint: string): Promise<void> {
  await requireAdmin()
  await removePushSubscription(endpoint)
  revalidatePath('/admin')
}

/* ------------------------------ telegram ------------------------------ */

export async function saveBotTokenAction(token: string): Promise<string | void> {
  await requireAdmin()
  const trimmed = token.trim()
  // Bot tokens look like 123456789:AA... — a quick shape check catches a
  // pasted username or a half-copied string before Telegram rejects it.
  if (trimmed && !/^\d{6,}:[\w-]{30,}$/.test(trimmed)) {
    return 'توکن ربات معتبر به نظر نمی‌رسد.'
  }
  await saveSettings({ telegram_bot_token: trimmed })
  revalidatePath('/admin')
}

export async function botTokenAction(): Promise<string> {
  await requireAdmin()
  return (await getSettings()).telegram_bot_token
}

export async function pairingCodeAction(): Promise<string> {
  await requireAdmin()
  return createPairingCode()
}

export async function confirmPairingAction(
  code: string
): Promise<{ ok: true; name: string } | { ok: false; reason: string }> {
  await requireAdmin()
  const result = await confirmPairing(code)
  if (result.ok) revalidatePath('/admin')
  return result
}

export async function removeRecipientAction(chatId: string): Promise<void> {
  await requireAdmin()
  await removeTelegramRecipient(chatId)
  revalidatePath('/admin')
}

/** Proves the whole chain end to end, which is the only way to be sure. */
export async function sendTestNotificationAction(): Promise<void> {
  await requireAdmin()
  await notifyAdmin({
    title: 'اعلان آزمایشی',
    body: 'اعلان‌های پنل مدیریت به‌درستی کار می‌کنند.',
    url: '/admin',
  })
}
