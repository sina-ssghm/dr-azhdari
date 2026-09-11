import type { Metadata } from 'next'
import Link from 'next/link'
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
import { findTest } from '@/content/tests'
import { testsPage } from '@/content/tests-page'
import { getSettings } from '@/server/settings'
import { getOrderByRef } from '@/server/tests'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'پرداخت هزینه آزمون',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function TestOrderPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = await params
  const order = await getOrderByRef(ref).catch(() => null)
  if (!order) notFound()

  const test = findTest(order.testId)
  if (!test) notFound()

  const settings = await getSettings()
  const copy = testsPage.pay
  // Iran pays by card in toman, abroad pays in USDT. Unlike a session booking
  // there is no third rail here — the practice asked for exactly these two.
  const isCard = order.region === 'iran'

  const configured = isCard
    ? Boolean(settings.card_number || settings.card_sheba)
    : Boolean(settings.usdt_address)

  const qr =
    !isCard && settings.usdt_address
      ? await QRCode.toString(settings.usdt_address, {
          type: 'svg',
          margin: 1,
          color: { dark: '#2a2a26', light: '#ffffff' },
        })
      : null

  const endpoint = `/api/tests/${order.orderRef}/receipt`

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
          <div className="bg-sand-100 rounded-[var(--radius-card)] p-6">
            <dl className="grid gap-2 text-[0.8125rem] sm:grid-cols-2">
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-ink-400">{copy.test}</dt>
                <dd className="text-ink-900 sm:mt-1">{test.title}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-ink-400">{copy.name}</dt>
                <dd className="text-ink-900 sm:mt-1">{order.fullName}</dd>
              </div>
            </dl>

            <p className="border-line mt-4 flex items-center justify-between border-t pt-4">
              <span className="text-ink-400 text-[0.8125rem]">{copy.amount}</span>
              <span className="text-ink-900 text-[1.125rem] font-bold">
                {formatPrice(order.amount, order.currency)}
              </span>
            </p>
          </div>

          {order.paymentStatus === 'paid' && order.accessToken ? (
            <div className="rounded-[var(--radius-card)] border border-olive-200 bg-olive-50 p-6 text-center">
              <p className="font-bold text-olive-800">{copy.ready}</p>
              <p className="mt-2 text-[0.8125rem] leading-[2] text-olive-800/80">
                {copy.readyBody}
              </p>
              <Link
                href={`/t/${order.accessToken}`}
                className="mt-5 inline-flex h-[3rem] items-center rounded-full bg-olive-700 px-7 text-sm font-medium text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800"
              >
                {copy.open}
              </Link>
            </div>
          ) : order.paymentStatus === 'rejected' ? (
            <div className="rounded-[var(--radius-card)] border border-red-300 bg-red-50 p-6 text-center">
              <p className="font-bold text-red-800">{copy.rejected}</p>
              <p className="mt-2 text-[0.8125rem] leading-[2] text-red-800/80">
                {copy.rejectedBody}
              </p>
            </div>
          ) : order.paymentStatus === 'pending_review' ? (
            <div className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-6 text-center">
              <p className="font-bold text-amber-900">{copy.awaiting}</p>
              <p className="mt-2 text-[0.8125rem] leading-[2] text-amber-900/80">
                {copy.awaitingBody}
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

              {order.receiptPath ? (
                <ReceiptUpload endpoint={endpoint} />
              ) : (
                <PaidToggle endpoint={endpoint} />
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
