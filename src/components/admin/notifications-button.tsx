'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  botTokenAction,
  confirmPairingAction,
  removeRecipientAction,
  notificationStatusAction,
  pairingCodeAction,
  pushKeyAction,
  saveBotTokenAction,
  sendTestNotificationAction,
  subscribePushAction,
  unsubscribePushAction,
  type NotifyState,
} from '@/app/admin/(protected)/notifications-actions'
import { Modal } from '@/components/admin/modal'
import { BellIcon, CheckIcon, SpinnerIcon } from '@/components/icons'
import { inputClass } from '@/components/admin/ui'
import { cn, toPersianDigits } from '@/lib/utils'

type PushState = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed'

/**
 * base64url → the bytes `PushManager.subscribe` wants.
 *
 * Typed as ArrayBuffer rather than Uint8Array: the DOM signature insists on a
 * buffer backed by a plain ArrayBuffer, which a generic Uint8Array is not.
 */
function urlBase64ToBytes(value: string): ArrayBuffer {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

export function NotificationsButton({ initial }: { initial: NotifyState }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<NotifyState>(initial)
  const [push, setPush] = useState<PushState>('default')
  const [busy, startBusy] = useTransition()
  const [note, setNote] = useState<string | null>(null)

  const [token, setToken] = useState('')
  const [code, setCode] = useState<string | null>(null)
  const [pairError, setPairError] = useState<string | null>(null)

  // What the browser currently thinks, which is not what the server knows: a
  // permission can be revoked in browser settings without telling us.
  const readPushState = async () => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return setPush('unsupported')
    }
    if (Notification.permission === 'denied') return setPush('denied')
    const registration = await navigator.serviceWorker.getRegistration()
    const existing = await registration?.pushManager.getSubscription()
    if (existing) return setPush('subscribed')
    setPush(Notification.permission === 'granted' ? 'granted' : 'default')
  }

  useEffect(() => {
    if (!open) return
    void readPushState()
    void botTokenAction().then(setToken)
    void notificationStatusAction().then(setStatus)
  }, [open])

  const refresh = () => notificationStatusAction().then(setStatus)

  const enablePush = () =>
    startBusy(async () => {
      setNote(null)
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setPush(permission === 'denied' ? 'denied' : 'default')
          return
        }

        const registration = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        const key = await pushKeyAction()
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBytes(key),
        })

        const json = subscription.toJSON()
        await subscribePushAction({
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
          label: navigator.userAgent.slice(0, 120),
        })
        setPush('subscribed')
        await refresh()
      } catch (error) {
        console.error(error)
        setNote('فعال‌سازی اعلان مرورگر ناموفق بود.')
      }
    })

  const disablePush = () =>
    startBusy(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await unsubscribePushAction(subscription.endpoint)
        await subscription.unsubscribe()
      }
      await readPushState()
      await refresh()
    })

  const pushLabel: Record<PushState, string> = {
    unsupported: 'این مرورگر از اعلان پشتیبانی نمی‌کند',
    default: 'فعال نشده',
    granted: 'اجازه داده شده، اما این دستگاه ثبت نشده',
    denied: 'در تنظیمات مرورگر مسدود شده است',
    subscribed: 'فعال است',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-[0.8125rem] font-medium transition-colors',
          status.devices > 0 || status.recipients.length > 0
            ? 'bg-olive-100 text-olive-800 hover:bg-olive-200'
            : 'border-line-strong text-ink-700 hover:bg-sand-200 border bg-white'
        )}
      >
        <BellIcon className="size-4" />
        اعلان‌ها
        {status.devices > 0 || status.recipients.length > 0 ? (
          <CheckIcon className="size-3.5" />
        ) : null}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="اعلان‌ها"
        description="از رزروهای تازه و رسیدهای پرداخت باخبر شوید."
      >
        <div className="flex flex-col gap-4">
          {note ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800">
              {note}
            </p>
          ) : null}

          {/* Browser */}
          <section className="border-line rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-ink-900 text-[0.875rem] font-bold">اعلان مرورگر</h3>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[0.6875rem] font-medium',
                  push === 'subscribed'
                    ? 'bg-olive-100 text-olive-800'
                    : push === 'denied' || push === 'unsupported'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-sand-200 text-ink-500'
                )}
              >
                {pushLabel[push]}
              </span>
            </div>

            <p className="text-ink-400 mt-2 text-[0.75rem] leading-[1.9]">
              روی همین دستگاه فعال می‌شود. برای دریافت روی گوشی، همین صفحه را روی گوشی باز
              کنید و دوباره فعال کنید.
              {status.devices > 0
                ? ` هم‌اکنون ${toPersianDigits(status.devices)} دستگاه ثبت شده است.`
                : ''}
            </p>

            {push === 'denied' ? (
              <p className="text-ink-500 mt-3 text-[0.75rem] leading-[1.9]">
                اجازه اعلان برای این سایت مسدود شده است. از تنظیمات مرورگر آن را مجاز کنید
                و دوباره تلاش کنید.
              </p>
            ) : push === 'unsupported' ? null : (
              <button
                type="button"
                onClick={push === 'subscribed' ? disablePush : enablePush}
                disabled={busy}
                className={cn(
                  'mt-3 inline-flex h-10 items-center gap-2 rounded-full px-5 text-[0.8125rem] font-medium transition-colors disabled:opacity-60',
                  push === 'subscribed'
                    ? 'border-line text-ink-700 hover:bg-sand-200 border bg-white'
                    : 'bg-olive-700 text-white hover:bg-olive-800'
                )}
              >
                {busy ? <SpinnerIcon className="size-3.5 animate-spin" /> : null}
                {push === 'subscribed' ? 'غیرفعال کردن این دستگاه' : 'فعال کردن'}
              </button>
            )}
          </section>

          {/* Telegram */}
          <section className="border-line rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-ink-900 text-[0.875rem] font-bold">اعلان تلگرام</h3>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[0.6875rem] font-medium',
                  status.recipients.length > 0
                    ? 'bg-olive-100 text-olive-800'
                    : 'bg-sand-200 text-ink-500'
                )}
              >
                {status.recipients.length > 0
                  ? `${toPersianDigits(status.recipients.length)} گیرنده`
                  : 'متصل نیست'}
              </span>
            </div>

            {/* Only offered while nothing is configured — once a token is
                saved it belongs in Settings, not on a dialog that is opened to
                add a recipient. */}
            {!status.telegramReady ? (
              <>
                <label
                  htmlFor="bot-token"
                  className="text-ink-500 mt-3 mb-2 block text-[0.75rem]"
                >
                  توکن ربات (از @BotFather)
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id="bot-token"
                    type="text"
                    dir="ltr"
                    autoComplete="off"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="123456789:AAE..."
                    className={`${inputClass} flex-1 text-start font-mono`}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      startBusy(async () => {
                        setNote((await saveBotTokenAction(token)) ?? null)
                        await refresh()
                      })
                    }
                    className="h-[2.85rem] shrink-0 rounded-xl bg-olive-700 px-5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-olive-800 disabled:opacity-60"
                  >
                    ذخیره توکن
                  </button>
                </div>
              </>
            ) : (
              <p className="text-ink-400 mt-2 text-[0.75rem] leading-[1.9]">
                توکن ربات ذخیره شده است و از صفحه «تنظیمات» قابل تغییر است.
              </p>
            )}

            {status.recipients.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2">
                {status.recipients.map((recipient) => (
                  <li
                    key={recipient.chatId}
                    className="border-line flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="text-ink-900 block truncate text-[0.8125rem] font-medium">
                        {recipient.name || 'گیرنده'}
                      </span>
                      <span dir="ltr" className="text-ink-400 block text-[0.6875rem]">
                        {recipient.chatId}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        startBusy(async () => {
                          await removeRecipientAction(recipient.chatId)
                          await refresh()
                        })
                      }
                      className="text-ink-400 shrink-0 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                    >
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {
              <div className="mt-3">
                {code === null ? (
                  <button
                    type="button"
                    disabled={busy || !status.telegramReady}
                    onClick={() =>
                      startBusy(async () => {
                        setPairError(null)
                        setCode(await pairingCodeAction())
                      })
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-olive-700 px-5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-olive-800 disabled:opacity-60"
                  >
                    {busy ? <SpinnerIcon className="size-3.5 animate-spin" /> : null}
                    {status.recipients.length > 0
                      ? 'افزودن گیرنده دیگر'
                      : 'ساخت کد اتصال'}
                  </button>
                ) : (
                  <div className="bg-sand-100 rounded-xl p-4">
                    <p className="text-ink-500 text-[0.75rem] leading-[2]">
                      ۱. در تلگرام ربات خود را باز کنید. <br />
                      ۲. کد زیر را برای ربات بفرستید. <br />
                      ۳. سپس دکمه «بررسی اتصال» را بزنید.
                    </p>
                    <p
                      dir="ltr"
                      className="text-ink-900 border-line mt-3 rounded-lg border border-dashed bg-white py-3 text-center text-[1.35rem] font-bold tracking-[0.3em] tabular-nums"
                    >
                      {code}
                    </p>
                    <p className="text-ink-400 mt-2 text-[0.6875rem]">
                      این کد تا ۱۵ دقیقه معتبر است.
                    </p>

                    {pairError ? (
                      <p className="mt-2 text-[0.75rem] text-red-700">{pairError}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          startBusy(async () => {
                            setPairError(null)
                            const result = await confirmPairingAction(code)
                            if (result.ok) {
                              setCode(null)
                              await refresh()
                            } else {
                              setPairError(result.reason)
                            }
                          })
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-olive-700 px-5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-olive-800 disabled:opacity-60"
                      >
                        {busy ? <SpinnerIcon className="size-3.5 animate-spin" /> : null}
                        بررسی اتصال
                      </button>
                      <button
                        type="button"
                        onClick={() => setCode(null)}
                        className="text-ink-500 hover:bg-sand-200 h-10 rounded-full px-4 text-[0.8125rem] transition-colors"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                )}

                {!status.telegramReady ? (
                  <p className="text-ink-400 mt-2 text-[0.75rem]">
                    ابتدا توکن ربات را ذخیره کنید.
                  </p>
                ) : null}
              </div>
            }
          </section>

          {status.devices > 0 || status.recipients.length > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => startBusy(() => sendTestNotificationAction())}
              className="border-line text-ink-700 hover:bg-sand-200 inline-flex h-10 items-center gap-2 self-start rounded-full border bg-white px-5 text-[0.8125rem] transition-colors disabled:opacity-60"
            >
              {busy ? <SpinnerIcon className="size-3.5 animate-spin" /> : null}
              ارسال اعلان آزمایشی
            </button>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
