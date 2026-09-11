'use client'

/**
 * The payment panels: transfer details, and the receipt uploader.
 *
 * Shared by session bookings and online tests — both take the same money the
 * same way, and the uploader in particular carries enough hard-won behaviour
 * (progress, stall watchdog, cancel, MIME fallbacks) that a second copy would
 * be a second set of bugs. The endpoint is a prop; nothing else differs.
 */

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { CheckIcon, CloseIcon, SpinnerIcon, UploadIcon } from '@/components/icons'
import { bookingPage } from '@/content/booking-page'
import {
  isAllowedReceipt,
  isHeicReceipt,
  MAX_RECEIPT_BYTES,
  RECEIPT_ACCEPT,
} from '@/lib/receipt-limits'
import { cn, groupChars, toPersianDigits } from '@/lib/utils'

/**
 * Copies `value` verbatim.
 *
 * Always the raw value, never what is on screen: the card number and sheba are
 * displayed in groups of four to be readable, and pasting those spaces into a
 * banking app is how a transfer gets rejected.
 */
function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = bookingPage.pay

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch {
          // Clipboard can be blocked; the value is selectable either way.
        }
      }}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors',
        className
      )}
    >
      {copied ? copy.copied : copy.copy}
    </button>
  )
}

/** Value plus a copy button — wallet addresses and the network. */
export function CopyRow({
  label,
  value,
  mono = true,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="border-line rounded-xl border bg-white p-3">
      <p className="text-ink-400 text-[0.6875rem]">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <span
          dir="ltr"
          className={cn(
            'text-ink-900 min-w-0 flex-1 text-start text-[0.875rem] break-all',
            mono && 'font-mono tabular-nums'
          )}
        >
          {value}
        </span>
        <CopyButton value={value} className="text-ink-500 hover:bg-sand-200" />
      </div>
    </div>
  )
}

/**
 * The transfer details drawn as a bank card.
 *
 * Digits stay Latin and grouped in fours. This is the one place on the site
 * where Persian numerals would be a liability: the visitor is about to retype
 * these into a banking app, and grouped Latin digits are what every Iranian
 * bank prints on the card itself.
 */
export function BankCard({
  title,
  cardNumber,
  sheba,
  holder,
}: {
  title: string
  cardNumber: string
  sheba: string
  holder: string
}) {
  return (
    // Charcoal rather than olive: the "پرداخت کردم" button directly below is
    // olive, and a card in the same colour read as part of it.
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[1.375rem] bg-gradient-to-br from-[#23231f] via-[#32312c] to-[#403e37] p-6 text-white shadow-[0_18px_44px_-20px_rgba(42,42,38,0.7)] sm:p-7">
      {/* Sheen, so the flat fill reads as a physical card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-white/[0.12]"
      />

      <div className="relative flex flex-col gap-7">
        <h2 className="text-sand-200 text-[0.8125rem] font-medium">{title}</h2>

        {/* No field labels: a 16-digit group, an IR-prefixed run and a name are
            each unmistakable, and the labels only crowded the card. */}
        {cardNumber ? (
          <div className="flex items-center gap-2">
            <span
              dir="ltr"
              className="flex-1 text-start text-[1.125rem] font-semibold tracking-[0.08em] tabular-nums sm:text-[1.25rem]"
            >
              {groupChars(cardNumber)}
            </span>
            <CopyButton
              value={cardNumber}
              className="bg-white/10 text-white hover:bg-white/20"
            />
          </div>
        ) : null}

        {sheba ? (
          <div className="flex items-center gap-2">
            <span
              dir="ltr"
              className="text-sand-200 flex-1 text-start text-[0.875rem] tracking-[0.04em] tabular-nums"
            >
              {groupChars(sheba)}
            </span>
            {/* Copies the digits without IR — banking apps supply the prefix
                themselves and reject it when it is pasted in twice. */}
            <CopyButton
              value={sheba.replace(/^IR/i, '')}
              className="bg-white/10 text-white hover:bg-white/20"
            />
          </div>
        ) : null}

        {holder ? <p className="text-[0.9375rem] font-semibold">{holder}</p> : null}
      </div>
    </div>
  )
}

/** `1536000` → «۱٫۵ مگابایت». */
function readableSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 0.1
    ? `${toPersianDigits(mb.toFixed(1))} مگابایت`
    : `${toPersianDigits(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`
}

/** How long the upload may go without a byte moving or a word from the server. */
const STALL_TIMEOUT_MS = 60_000

export function ReceiptUpload({ endpoint }: { endpoint: string }) {
  const router = useRouter()
  const copy = bookingPage.receipt

  const inputRef = useRef<HTMLInputElement>(null)
  /** Held so the visitor can call off an upload in flight. */
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const watchdogRef = useRef<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  /** null while idle; 0–100 once the upload starts. */
  const [progress, setProgress] = useState<number | null>(null)

  // Object URLs hold the file in memory until revoked.
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Only the timer is dropped on unmount, never the request: an upload that is
  // about to land should still land — the receipt reaching the practice matters
  // more than this panel being around to see it happen. The watchdog, though,
  // has nothing left to write into and would eventually abort a live request.
  useEffect(
    () => () => {
      if (watchdogRef.current !== null) window.clearInterval(watchdogRef.current)
    },
    []
  )

  const choose = (next: File | undefined) => {
    if (!next) return

    const reject = (message: string) => {
      setFile(null)
      // Clearing the input matters: picking the very same file again dispatches
      // no `change` event while it is still the input's value, so without this
      // a second attempt at the same file looks like a dead form.
      if (inputRef.current) inputRef.current.value = ''
      setError(message)
    }

    // Checked before sending, so a file that was never going to be accepted
    // does not cost the visitor a minute of upload first.
    if (next.size > MAX_RECEIPT_BYTES) {
      return reject(
        `حجم فایل نباید بیشتر از ۵ مگابایت باشد — این فایل ${readableSize(next.size)} است.`
      )
    }
    if (!isAllowedReceipt(next)) {
      return reject(
        isHeicReceipt(next)
          ? 'عکس‌های HEIC آیفون پشتیبانی نمی‌شوند. لطفاً از رسید اسکرین‌شات بگیرید و همان را بفرستید.'
          : 'فقط تصویر (JPG، PNG، WebP) یا PDF پذیرفته می‌شود.'
      )
    }
    setError(null)
    setFile(next)
  }

  const upload = () => {
    if (!file || progress !== null) return
    setError(null)
    setProgress(0)

    const body = new FormData()
    body.append('receipt', file)

    // XHR, not fetch: it is the only way to observe upload progress, and a
    // silent minute on a phone connection is how a visitor concludes the site
    // is broken and gives up half-paid.
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint)

    // A watchdog on silence, not on total time: `xhr.timeout` would abort a
    // 5 MB upload that is crawling along perfectly well on a phone connection.
    // What must never happen is the opposite — bytes all sent, no answer, and
    // the panel showing «در حال بررسی فایل…» for ever.
    let lastActivity = Date.now()
    const watchdog = window.setInterval(() => {
      if (Date.now() - lastActivity < STALL_TIMEOUT_MS) return
      window.clearInterval(watchdog)
      xhr.abort()
      setProgress(null)
      setError(copy.stalled)
    }, 5_000)
    watchdogRef.current = watchdog
    const stopWatchdog = () => {
      window.clearInterval(watchdog)
      watchdogRef.current = null
    }
    xhrRef.current = xhr

    // Fires when the watchdog or the visitor cancels, and when the browser
    // tears the request down itself. Without it those paths would leave the
    // panel in its uploading state with every control withdrawn.
    xhr.addEventListener('abort', () => {
      stopWatchdog()
      xhrRef.current = null
      setProgress(null)
    })

    xhr.upload.addEventListener('progress', (event) => {
      lastActivity = Date.now()
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      stopWatchdog()
      xhrRef.current = null
      if (xhr.status >= 200 && xhr.status < 300) {
        setSent(true)
        // Re-renders the page as "awaiting review" from the server.
        router.refresh()
        return
      }
      setProgress(null)
      let message = 'بارگذاری رسید ناموفق بود. لطفاً دوباره تلاش کنید.'
      try {
        message = JSON.parse(xhr.responseText).error ?? message
      } catch {
        // A proxy error page rather than our JSON; keep the generic message.
      }
      setError(message)
    })

    xhr.addEventListener('error', () => {
      stopWatchdog()
      xhrRef.current = null
      setProgress(null)
      setError('ارتباط با سرور برقرار نشد. اتصال خود را بررسی کنید.')
    })

    xhr.send(body)
  }

  /** Abandoning a crawling upload to send a smaller file is a fair thing to want. */
  const cancel = () => {
    xhrRef.current?.abort()
    setError(copy.cancelled)
  }

  if (sent) {
    return (
      <div className="bg-sand-100 rounded-[var(--radius-card)] p-6 text-center lg:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-olive-700 text-white">
          <CheckIcon className="size-6" />
        </span>
        <h2 className="text-ink-900 mt-5 text-[1.125rem] font-bold">{copy.done}</h2>
        <p className="text-ink-500 mt-3 text-[0.8125rem] leading-[2]">{copy.doneBody}</p>
      </div>
    )
  }

  const uploading = progress !== null

  return (
    <div className="bg-sand-100 rounded-[var(--radius-card)] p-6 lg:p-7">
      <h2 className="text-ink-900 text-[0.9375rem] font-bold">{copy.title}</h2>
      <p className="text-ink-500 mt-2 text-[0.8125rem] leading-[1.95]">{copy.body}</p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800"
        >
          {error}
        </p>
      ) : null}

      {/* Kept in the DOM at all times: it is the file picker the whole zone
          delegates to, and replacing it would drop the selection. */}
      <input
        ref={inputRef}
        id="receipt"
        name="receipt"
        type="file"
        accept={RECEIPT_ACCEPT}
        onChange={(event) => choose(event.target.files?.[0])}
        className="sr-only"
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            choose(event.dataTransfer.files[0])
          }}
          className={cn(
            'mt-5 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors',
            dragging
              ? 'border-olive-600 bg-olive-50'
              : 'border-line-strong bg-white/70 hover:border-olive-400'
          )}
        >
          <UploadIcon className="text-ink-400 size-7" />
          <span className="text-ink-700 text-[0.8125rem] font-medium">{copy.drop}</span>
          <span className="text-ink-400 text-[0.75rem]">{copy.browse}</span>
          <span className="text-ink-400 mt-1 text-[0.6875rem]">
            {toPersianDigits(copy.hint)}
          </span>
        </button>
      ) : (
        <div className="border-line mt-5 rounded-2xl border bg-white p-3">
          <div className="flex items-center gap-3">
            {preview ? (
              // A local object URL for a file that never leaves the browser —
              // there is nothing for the image optimiser to fetch.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="border-line size-16 shrink-0 rounded-xl border object-cover"
              />
            ) : (
              <span className="bg-sand-200 text-ink-500 grid size-16 shrink-0 place-items-center rounded-xl text-[0.625rem] font-bold">
                PDF
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-ink-900 truncate text-[0.8125rem] font-medium">
                {file.name}
              </p>
              <p className="text-ink-400 mt-1 text-[0.6875rem]">
                {readableSize(file.size)}
              </p>
            </div>

            {!uploading ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-ink-500 hover:bg-sand-200 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors"
                >
                  {copy.change}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setError(null)
                    if (inputRef.current) inputRef.current.value = ''
                  }}
                  aria-label={copy.remove}
                  className="text-ink-400 grid size-8 place-items-center rounded-full transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <CloseIcon className="size-3.5" />
                </button>
              </div>
            ) : (
              // The one control that stays while sending. A visitor on a slow
              // connection who wants to abandon a 5 MB photo and send a
              // screenshot instead otherwise has only the reload button.
              <button
                type="button"
                onClick={cancel}
                className="text-ink-500 hover:bg-sand-200 shrink-0 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors hover:text-red-700"
              >
                {copy.cancel}
              </button>
            )}
          </div>

          {uploading ? (
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-ink-500 text-[0.75rem]">
                  {/* 100% only means the bytes have arrived; the server still
                      has to accept and store them. */}
                  {progress < 100 ? copy.sending : copy.checking}
                </span>
                <span className="text-[0.8125rem] font-bold text-olive-700 tabular-nums">
                  {toPersianDigits(progress)}٪
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="bg-sand-200 h-2 w-full overflow-hidden rounded-full"
              >
                <div
                  className="h-full rounded-full bg-olive-700 transition-[width] duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      <button
        type="button"
        onClick={upload}
        disabled={!file || uploading}
        className="mt-5 inline-flex h-[3.125rem] items-center gap-2 rounded-full bg-olive-700 px-7 text-sm font-medium text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800 disabled:pointer-events-none disabled:opacity-50"
      >
        {uploading ? <SpinnerIcon className="size-4 animate-spin" /> : null}
        {uploading ? copy.sending : copy.submit}
      </button>
    </div>
  )
}

/** Reveals the upload form only once the visitor says they have paid. */
export function PaidToggle({ endpoint }: { endpoint: string }) {
  const [shown, setShown] = useState(false)

  if (shown) return <ReceiptUpload endpoint={endpoint} />

  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="inline-flex h-[3.25rem] w-full items-center justify-center rounded-full bg-olive-700 px-7 text-sm font-medium text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800"
    >
      {bookingPage.pay.paid}
    </button>
  )
}
