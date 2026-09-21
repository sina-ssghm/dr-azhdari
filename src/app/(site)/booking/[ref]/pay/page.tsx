import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import {
  BankCard,
  CopyRow,
  PaidToggle,
  ReceiptUpload,
} from '@/components/payment/payment-panels'
import { Container } from '@/components/ui/container'
import { LockIcon, TetherIcon } from '@/components/icons'
import { bookingPage } from '@/content/booking-page'
import { isCardPayment } from '@/lib/payment'
import { getBooking } from '@/server/appointments'
import { getSettings, serviceTitle } from '@/server/settings'
import { describeDate } from '@/lib/jalali'
import { formatAmount, toPersianDigits } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'پرداخت رزرو',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function PayPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const booking = await getBooking(ref).catch(() => [])
  const first = booking[0]
  if (!first) notFound()

  const settings = await getSettings()
  const copy = bookingPage.pay
  // Card versus crypto, not Iran versus abroad: a client abroad can pay by
  // card to the same Iranian account, and showing them a wallet address next
  // to a toman amount is how a payment goes astray.
  const isCard = isCardPayment(first.paymentMethod)
  const currency = first.currency ?? (isCard ? 'IRT' : 'USDT')
  const amount = booking.find((b) => b.amount !== null)?.amount ?? 0

  // A booking can hold several appointments on different days. Group by day so
  // each date carries its own hours instead of pinning them all to the first.
  const byDate = new Map<string, string[]>()
  for (const b of booking) {
    const list = byDate.get(b.scheduledOn) ?? []
    list.push(b.scheduledAt)
    byDate.set(b.scheduledOn, list)
  }
  const days = [...byDate.entries()]

  const configured = isCard
    ? Boolean(settings.card_number || settings.card_sheba)
    : Boolean(settings.usdt_address)

  // Rendered server-side so no QR library reaches the browser, and only for
  // the bookings that will actually be shown one.
  const qr =
    !isCard && settings.usdt_address
      ? await QRCode.toString(settings.usdt_address, {
          type: 'svg',
          margin: 1,
          color: { dark: '#2a2a26', light: '#ffffff' },
        })
      : null

  const awaiting = first.paymentStatus === 'pending_review'

  return (
    <section className="bg-sand-50 pt-32 pb-20 lg:pt-40 lg:pb-28">
      <Container>
        <header className="flex flex-col items-center text-center">
          <h1 className="font-display text-[1.875rem] font-bold text-olive-700 lg:text-[2.25rem]">
            {copy.title}
          </h1>
          <p className="text-ink-400 mt-3 text-[0.875rem]">{copy.subtitle}</p>
        </header>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 lg:mt-12">
          {/* Booking summary */}
          <div className="bg-sand-100 rounded-[var(--radius-card)] p-6">
            <dl className="grid gap-2 text-[0.8125rem] sm:grid-cols-2">
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-ink-400">{bookingPage.review.service}</dt>
                <dd className="text-ink-900 sm:mt-1">{serviceTitle(first.serviceId)}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-ink-400">{bookingPage.review.sessions}</dt>
                <dd className="text-ink-900 flex flex-col gap-1.5 sm:mt-1">
                  {days.map(([date, times]) => {
                    const when = describeDate(new Date(`${date}T12:00:00Z`))
                    return (
                      <span key={date}>
                        {toPersianDigits(`${when.weekday} ${when.full}`)}
                        {' — ساعت '}
                        <span dir="ltr" className="tabular-nums">
                          {times.map((t) => toPersianDigits(t)).join(' ، ')}
                        </span>
                      </span>
                    )
                  })}
                </dd>
              </div>
            </dl>

            <p className="border-line mt-4 flex items-center justify-between border-t pt-4">
              <span className="text-ink-400 text-[0.8125rem]">{copy.amount}</span>
              <span className="text-ink-900 text-[1.125rem] font-bold">
                {formatAmount(amount, currency)}
              </span>
            </p>
          </div>

          {awaiting ? (
            <div className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-6 text-center">
              <p className="font-bold text-amber-900">{bookingPage.receipt.pending}</p>
              <p className="mt-2 text-[0.8125rem] leading-[2] text-amber-900/80">
                {bookingPage.receipt.doneBody}
              </p>
            </div>
          ) : !configured ? (
            <p className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 px-6 py-5 text-center text-[0.8125rem] text-amber-900">
              {copy.notConfigured}
            </p>
          ) : (
            <>
              {isCard ? (
                <BankCard
                  title={copy.cardTitle}
                  cardNumber={settings.card_number}
                  sheba={settings.card_sheba}
                  holder={settings.card_holder}
                />
              ) : (
                <div className="bg-sand-100 rounded-[var(--radius-card)] p-6 lg:p-7">
                  <h2 className="text-ink-900 inline-flex items-center gap-2 text-[0.9375rem] font-bold">
                    <TetherIcon className="size-5" />
                    {copy.usdtTitle}
                  </h2>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
                    {qr ? (
                      <div className="border-line mx-auto w-[10.5rem] rounded-xl border bg-white p-3">
                        <div
                          className="[&>svg]:h-auto [&>svg]:w-full"
                          // Generated from the stored address by the qrcode
                          // library — no user input reaches this markup.
                          dangerouslySetInnerHTML={{ __html: qr }}
                        />
                        <p className="text-ink-400 mt-2 text-center text-[0.625rem] leading-relaxed">
                          {copy.scan}
                        </p>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2.5">
                      <CopyRow label={copy.address} value={settings.usdt_address} />
                      {settings.usdt_network ? (
                        <CopyRow
                          label={copy.network}
                          value={settings.usdt_network}
                          mono={false}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {first.receiptPath ? (
                <ReceiptUpload endpoint={`/api/booking/${ref}/receipt`} />
              ) : (
                <PaidToggle endpoint={`/api/booking/${ref}/receipt`} />
              )}
            </>
          )}

          <p className="bg-sand-100 text-ink-500 flex items-center justify-center gap-3 rounded-[var(--radius-card)] px-6 py-5 text-center text-[0.8125rem] leading-[1.9]">
            <LockIcon className="size-[1.05rem] shrink-0 text-olive-700" />
            {bookingPage.notice}
          </p>
        </div>
      </Container>
    </section>
  )
}
