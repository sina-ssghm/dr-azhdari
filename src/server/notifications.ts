import 'server-only'

import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import webpush from 'web-push'
import { bookingPage } from '@/content/booking-page'
import { getPool } from '@/lib/db'
import { describeDate } from '@/lib/jalali'
import { receiptContentType } from '@/lib/receipts'
import { isReservedTestPhone, isTestFixtureName } from '@/lib/test-fixtures'
import { formatAmount, toPersianDigits } from '@/lib/utils'
import { getBooking } from '@/server/appointments'
import { getSettings, saveSettings, serviceTitle } from '@/server/settings'

/**
 * Two ways to be told a booking came in: a browser push notification, and a
 * Telegram message from the practice's own bot.
 *
 * Both are opt-in and independent. Sending is best-effort throughout — a
 * booking must never fail because a notification could not be delivered.
 */

export type NotificationEvent = {
  title: string
  body: string
  /** Panel path to open. Sent absolute — a bare `/admin/...` is not tappable. */
  url?: string
  /** A receipt to attach. Telegram only; a push cannot carry a private file. */
  attachment?: { path: string; filename: string } | null
  /**
   * Whoever the alert is about.
   *
   * Supplied so something the test suite created can be recognised and left
   * undelivered — see {@link isReservedTestPhone} and
   * {@link isTestFixtureName}. A comment carries no phone, hence both.
   */
  phone?: string | null
  name?: string | null
}

/**
 * Notifications leave the site, so every link has to carry the origin.
 * `NEXT_PUBLIC_SITE_URL` is already the canonical origin used for metadata.
 */
function absoluteUrl(path: string): string {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '')
  if (!origin) return path
  return path.startsWith('http') ? path : `${origin}${path}`
}

/* ------------------------------ deadlines ------------------------------ */

/**
 * Nothing outbound is allowed to hang.
 *
 * Every send in this file crosses the open internet to a third party, and from
 * Iran api.telegram.org is routinely slow and sometimes unreachable. Neither
 * Node's fetch nor web-push has a default timeout, so a stalled socket waits
 * on the operating system — minutes, or forever. That is how a receipt upload
 * came to sit at «در حال بررسی فایل…» with the file already safely stored.
 */
const TEXT_TIMEOUT_MS = 10_000
/** A receipt is up to 5 MB, so an upload gets longer than a plain message. */
const FILE_TIMEOUT_MS = 45_000
const PUSH_TIMEOUT_MS = 10_000
/**
 * A ceiling on the whole fan-out, whatever the individual deadlines add up to
 * across however many recipients and devices are registered.
 */
const TOTAL_TIMEOUT_MS = 60_000

/* --------------------------- booking summary --------------------------- */

/**
 * The whole reservation as a block of text.
 *
 * Built here rather than at each call site so the receipt alert and the
 * confirmation say exactly the same thing about the same booking.
 */
export async function bookingSummary(ref: string): Promise<string> {
  const booking = await getBooking(ref)
  const first = booking[0]
  if (!first) return ''

  const when = describeDate(new Date(`${first.scheduledOn}T12:00:00Z`))
  const times = booking.map((session) => session.scheduledAt).join('، ')
  const amount = booking.find((session) => session.amount !== null)?.amount ?? 0
  const method = first.paymentMethod
    ? (bookingPage.payment.methods.find((m) => m.id === first.paymentMethod)?.title ??
      first.paymentMethod)
    : '—'

  const lines = [
    `مراجع: ${first.fullName}`,
    // Phone and email stay Latin: Telegram makes them tappable, and Persian
    // numerals in a phone number are neither dialable nor copyable.
    `تماس: ${first.phone}`,
    first.email ? `ایمیل: ${first.email}` : null,
    `نوع مشاوره: ${serviceTitle(first.serviceId)}`,
    `مدت هر جلسه: ${toPersianDigits(bookingPage.duration.label(first.durationMin))}`,
    `جلسات: ${toPersianDigits(`${when.weekday} ${when.full} — ساعت ${times}`)}`,
    `روش پرداخت: ${method}`,
    `مبلغ: ${formatAmount(amount, first.currency ?? 'IRT')}`,
    first.discountCode ? `کد تخفیف: ${first.discountCode}` : null,
    first.notes ? `توضیحات: ${first.notes}` : null,
  ].filter(Boolean)

  return lines.join('\n')
}

/* ------------------------------ web push ------------------------------ */

/**
 * VAPID keys identify this server to the push services.
 *
 * Generated on first use and kept in `app_setting` rather than the
 * environment, so turning notifications on needs no redeploy and no file
 * editing. The private half is a secret, held in the same database as the
 * password hash.
 */
async function vapid(): Promise<{ publicKey: string; privateKey: string }> {
  const settings = await getSettings()
  if (settings.vapid_public && settings.vapid_private) {
    return { publicKey: settings.vapid_public, privateKey: settings.vapid_private }
  }

  const keys = webpush.generateVAPIDKeys()
  await saveSettings({ vapid_public: keys.publicKey, vapid_private: keys.privateKey })
  return keys
}

/** The half the browser needs in order to subscribe. */
export async function getPushPublicKey(): Promise<string> {
  return (await vapid()).publicKey
}

export type PushSubscriptionInput = {
  endpoint: string
  p256dh: string
  auth: string
  label?: string | null
}

export async function savePushSubscription(input: PushSubscriptionInput): Promise<void> {
  await getPool().query(
    `insert into push_subscription (endpoint, p256dh, auth, label)
     values ($1, $2, $3, $4)
     on conflict (endpoint) do update
       set p256dh = excluded.p256dh, auth = excluded.auth, label = excluded.label`,
    [input.endpoint, input.p256dh, input.auth, input.label ?? null]
  )
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await getPool().query('delete from push_subscription where endpoint = $1', [endpoint])
}

export async function countPushSubscriptions(): Promise<number> {
  const { rows } = await getPool().query<{ n: string }>(
    'select count(*)::text as n from push_subscription'
  )
  return Number(rows[0]?.n ?? 0)
}

async function sendPush(event: NotificationEvent): Promise<void> {
  const { rows } = await getPool().query<{
    endpoint: string
    p256dh: string
    auth: string
  }>('select endpoint, p256dh, auth from push_subscription')
  if (rows.length === 0) return

  const keys = await vapid()
  webpush.setVapidDetails('mailto:noreply@localhost', keys.publicKey, keys.privateKey)

  // The receipt is not sent here: it lives behind the admin session, so the
  // browser could not fetch it to render in a notification. Tapping through
  // opens the panel, which can.
  const payload = JSON.stringify({
    title: event.title,
    body: event.body,
    url: event.url ? absoluteUrl(event.url) : undefined,
  })

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload,
          // web-push drives a raw https request, which otherwise inherits
          // Node's "wait indefinitely" default.
          { timeout: PUSH_TIMEOUT_MS }
        )
      } catch (error) {
        // 404/410 mean the browser threw the subscription away — a phone that
        // was reset, or permission revoked. Drop it rather than retrying it
        // on every future booking.
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await removePushSubscription(row.endpoint)
          return
        }
        console.error('[notify] push failed', status, error)
      }
    })
  )
}

/* ------------------------------ telegram ------------------------------ */

/**
 * Overridable so the delivery path can be exercised without a real bot.
 *
 * `||`, not `??`: compose passes the variable through as an empty string when
 * it is unset, and `??` would keep that empty string as the base URL — every
 * call then builds a relative path and fails with ERR_INVALID_URL, which reads
 * from the panel as "Telegram is unreachable".
 */
const TELEGRAM_API = process.env.TELEGRAM_API_URL?.trim() || 'https://api.telegram.org'

/** Unambiguous characters only — this gets read off a screen and retyped. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export async function createPairingCode(): Promise<string> {
  const pool = getPool()
  await pool.query('delete from telegram_pairing where expires_at < now()')

  const code = [...randomBytes(6)]
    .map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
    .join('')

  await pool.query(
    `insert into telegram_pairing (code, expires_at)
     values ($1, now() + interval '15 minutes')`,
    [code]
  )
  return code
}

export type TelegramRecipient = { chatId: string; name: string | null }

export async function listTelegramRecipients(): Promise<TelegramRecipient[]> {
  const { rows } = await getPool().query<{ chat_id: string; name: string | null }>(
    'select chat_id, name from telegram_recipient order by created_at'
  )
  return rows.map((row) => ({ chatId: row.chat_id, name: row.name }))
}

export async function removeTelegramRecipient(chatId: string): Promise<void> {
  await getPool().query('delete from telegram_recipient where chat_id = $1', [chatId])
}

type TelegramUpdate = {
  update_id: number
  message?: { text?: string; chat?: { id?: number; first_name?: string; title?: string } }
}

/**
 * Looks for the pairing code in the bot's recent messages.
 *
 * `getUpdates` polling rather than a webhook: a webhook needs a public URL
 * Telegram can reach and a secret to verify it, and this is a one-off pairing
 * step that the admin triggers by pressing a button.
 */
export async function confirmPairing(
  code: string
): Promise<{ ok: true; name: string } | { ok: false; reason: string }> {
  const settings = await getSettings()
  const token = settings.telegram_bot_token.trim()
  if (!token) return { ok: false, reason: 'ابتدا توکن ربات را ذخیره کنید.' }

  const pool = getPool()
  const { rows: valid } = await pool.query(
    'select code from telegram_pairing where code = $1 and expires_at > now()',
    [code]
  )
  if (valid.length === 0) {
    return { ok: false, reason: 'کد منقضی شده است. کد تازه‌ای بسازید.' }
  }

  let updates: TelegramUpdate[]
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/getUpdates?limit=100`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await response.json()) as {
      ok: boolean
      result?: TelegramUpdate[]
      error_code?: number
      description?: string
    }

    if (!body.ok) {
      // Telegram's own words, rather than one generic line for every cause —
      // a revoked token, a webhook already claiming the updates and a typo all
      // fail here and need different fixes.
      if (body.error_code === 401) {
        return { ok: false, reason: 'توکن ربات پذیرفته نشد. آن را دوباره بررسی کنید.' }
      }
      if (body.error_code === 409) {
        return {
          ok: false,
          reason: 'برای این ربات webhook تنظیم شده است و پیام‌ها را می‌گیرد.',
        }
      }
      return {
        ok: false,
        reason: `تلگرام پاسخ داد: ${body.description ?? 'خطای نامشخص'}`,
      }
    }
    updates = body.result ?? []
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause?.code
    console.error('[notify] telegram getUpdates failed', cause ?? error)
    return {
      ok: false,
      reason: `ارتباط با تلگرام برقرار نشد${cause ? ` (${cause})` : ''}. اتصال سرور را بررسی کنید.`,
    }
  }

  const match = updates.find((update) =>
    update.message?.text?.toUpperCase().includes(code)
  )
  if (!match?.message?.chat?.id) {
    // Distinguishes "nothing has ever been sent to this bot" from "the code
    // did not match", which are two quite different mistakes.
    return {
      ok: false,
      reason:
        updates.length === 0
          ? 'هیچ پیامی به ربات نرسیده است. ابتدا در تلگرام /start را بزنید و سپس کد را بفرستید.'
          : 'کد در پیام‌های اخیر ربات پیدا نشد. دقیقاً همان کد را بفرستید.',
    }
  }

  const chatId = String(match.message.chat.id)
  const name = match.message.chat.first_name ?? match.message.chat.title ?? 'تلگرام'

  // Upsert: pairing the same phone twice should not add it twice.
  await pool.query(
    `insert into telegram_recipient (chat_id, name) values ($1, $2)
     on conflict (chat_id) do update set name = excluded.name`,
    [chatId, name]
  )
  await pool.query('delete from telegram_pairing where code = $1', [code])

  // Sent only to the chat that just paired, so the others are not pinged for
  // someone else's setup step.
  await sendToChat(token, chatId, {
    title: 'اعلان‌ها فعال شد',
    body: 'از این پس رزروهای جدید و رسیدهای پرداخت به همین گفتگو ارسال می‌شود.',
  })
  return { ok: true, name }
}

async function sendTelegram(event: NotificationEvent): Promise<void> {
  const settings = await getSettings()
  const token = settings.telegram_bot_token.trim()
  if (!token) return

  const recipients = await listTelegramRecipients()
  if (recipients.length === 0) return

  // One failing chat — someone who blocked the bot — must not stop the others.
  await Promise.all(
    recipients.map((recipient) => sendToChat(token, recipient.chatId, event))
  )
}

/** Delivers one event to one chat. Never throws. */
async function sendToChat(
  token: string,
  chatId: string,
  event: NotificationEvent
): Promise<void> {
  const text = [event.title, event.body, event.url ? absoluteUrl(event.url) : null]
    .filter(Boolean)
    .join('\n')

  try {
    // With a receipt, the message travels as the photo's caption so the image
    // and the details arrive as one thing rather than two.
    if (event.attachment) {
      const sent = await sendTelegramFile(token, chatId, text, event.attachment)
      if (sent) return
      // Fall through: an unreadable file should not cost the alert itself.
    }

    await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      cache: 'no-store',
      signal: AbortSignal.timeout(TEXT_TIMEOUT_MS),
    })
  } catch (error) {
    console.error('[notify] telegram send failed for', chatId, error)
  }
}

/**
 * Uploads the receipt with the details as its caption.
 *
 * Images go as photos so they preview inline; a PDF has to be a document.
 * Returns false when the file cannot be read or Telegram refuses it, so the
 * caller can still deliver the text.
 */
async function sendTelegramFile(
  token: string,
  chatId: string,
  caption: string,
  attachment: { path: string; filename: string }
): Promise<boolean> {
  let bytes: Buffer
  try {
    bytes = await readFile(attachment.path)
  } catch (error) {
    console.error('[notify] receipt unreadable', error)
    return false
  }

  const type = receiptContentType(attachment.filename)
  const isPdf = type === 'application/pdf'
  const field = isPdf ? 'document' : 'photo'

  const form = new FormData()
  form.append('chat_id', chatId)
  // Telegram truncates captions past 1024 characters.
  form.append('caption', caption.slice(0, 1024))
  form.append(field, new Blob([new Uint8Array(bytes)], { type }), attachment.filename)

  // Caught here rather than by the caller: a photo upload that times out
  // should still leave the plain-text alert a chance to get through, and the
  // details matter more than the image.
  let response: Response
  try {
    response = await fetch(
      `${TELEGRAM_API}/bot${token}/${isPdf ? 'sendDocument' : 'sendPhoto'}`,
      {
        method: 'POST',
        body: form,
        cache: 'no-store',
        signal: AbortSignal.timeout(FILE_TIMEOUT_MS),
      }
    )
  } catch (error) {
    console.error('[notify] telegram file upload failed', error)
    return false
  }

  if (!response.ok) {
    console.error(
      '[notify] telegram file rejected',
      response.status,
      await response.text()
    )
    return false
  }
  return true
}

/* -------------------------------- send -------------------------------- */

/**
 * Fire and forget, to both channels.
 *
 * Never throws, and never waits longer than {@link TOTAL_TIMEOUT_MS}: a
 * booking is not allowed to fail — or to be held up — because a push service
 * was unreachable, so every failure is logged and swallowed.
 */
export async function notifyAdmin(event: NotificationEvent): Promise<void> {
  // The end-to-end suites exercise the real endpoints against the real site;
  // without this every run buzzes the practice's phone about bookings that
  // will be deleted thirty seconds later.
  if (isReservedTestPhone(event.phone) || isTestFixtureName(event.name)) {
    console.info('[notify] suppressed for a test fixture', event.phone ?? event.name)
    return
  }

  let expire: ReturnType<typeof setTimeout> | undefined
  const budget = new Promise<'timeout'>((resolve) => {
    expire = setTimeout(() => resolve('timeout'), TOTAL_TIMEOUT_MS)
  })

  try {
    const outcome = await Promise.race([
      Promise.all([sendPush(event), sendTelegram(event)]),
      budget,
    ])
    // The sends carry on in the background; we simply stop waiting on them.
    if (outcome === 'timeout') console.error('[notify] gave up after 60s')
  } catch (error) {
    console.error('[notify] sending failed', error)
  } finally {
    clearTimeout(expire)
  }
}

export async function notificationStatus(): Promise<{
  devices: number
  telegramReady: boolean
  recipients: TelegramRecipient[]
}> {
  const [settings, devices, recipients] = await Promise.all([
    getSettings(),
    countPushSubscriptions(),
    listTelegramRecipients(),
  ])
  return {
    devices,
    telegramReady: settings.telegram_bot_token.trim() !== '',
    recipients,
  }
}
