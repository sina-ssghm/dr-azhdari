'use client'

import { useState } from 'react'
import type { BookingSlot, Quote } from '@/app/(site)/booking/actions'
import type { Details } from '@/components/booking/details-form'
import { bookingPage, type ServiceId } from '@/content/booking-page'
import { Flag } from '@/components/ui/flag'
import { describeDate } from '@/lib/jalali'
import { paymentRegion, type PaymentId } from '@/lib/payment'
import { findCountry, formatPhone, splitE164 } from '@/lib/phone'
import { formatAmount, toPersianDigits } from '@/lib/utils'

/**
 * Last stop before anything is written, and the only screen that shows a price.
 *
 * The phone number and email are given extra weight deliberately: a typo in
 * either is the most expensive mistake a visitor can make here, because it is
 * how the practice reaches them about the session.
 *
 * The total comes from the server, computed the same way the submit computes
 * it, so the number confirmed here cannot disagree with the number stored.
 */
export function ReviewPanel({
  serviceId,
  durationMin,
  slots,
  details,
  method,
  quote,
  discountApplied,
  submitting,
  error,
  onApplyDiscount,
  onClearDiscount,
  onEdit,
  onConfirm,
}: {
  serviceId: ServiceId
  durationMin: number
  slots: BookingSlot[]
  details: Details
  method: PaymentId
  quote: Quote | null
  discountApplied: boolean
  submitting: boolean
  error: string | null
  onApplyDiscount: (code: string) => void
  onClearDiscount: () => void
  onEdit: () => void
  onConfirm: () => void
}) {
  const copy = bookingPage.review
  const discountCopy = bookingPage.discount
  const service = bookingPage.service.options.find((o) => o.id === serviceId)
  const region = paymentRegion(method)

  // Grouped by day, in order, so several appointments read as a tidy list
  // rather than one date with a run of times that belong to different days.
  const byDate = new Map<string, string[]>()
  for (const slot of slots) {
    const list = byDate.get(slot.date) ?? []
    list.push(slot.time)
    byDate.set(slot.date, list)
  }
  const days = [...byDate.entries()]

  const regionLabel = bookingPage.payment.regions.find((r) => r.id === region)?.title
  const methodLabel = bookingPage.payment.methods.find((m) => m.id === method)?.title

  const [code, setCode] = useState('')
  const discounted = quote !== null && quote.payable < quote.base
  const phoneCountry = findCountry(splitE164(details.phone)?.country ?? '')

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="border-line flex flex-wrap items-start justify-between gap-3 border-b py-3 last:border-0">
      <dt className="text-ink-400 text-[0.8125rem]">{label}</dt>
      <dd className="text-ink-900 text-[0.8125rem]">{children}</dd>
    </div>
  )

  return (
    <div className="mx-auto mt-10 max-w-xl lg:mt-12">
      <div className="bg-sand-100 rounded-[var(--radius-card)] p-6 lg:p-8">
        <h2 className="text-ink-900 text-center text-[1.125rem] font-bold">
          {copy.title}
        </h2>
        <p className="text-ink-500 mt-3 text-center text-[0.8125rem] leading-[2]">
          {copy.body}
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800"
          >
            {error}
          </p>
        ) : null}

        <dl className="mt-6">
          <Row label={copy.service}>{service?.title}</Row>
          <Row label={copy.duration}>
            {toPersianDigits(bookingPage.duration.label(durationMin))}
          </Row>
          <Row label={copy.sessions}>
            <span className="flex flex-col gap-2">
              {days.map(([date, times]) => {
                const when = describeDate(new Date(`${date}T12:00:00Z`))
                return (
                  <span key={date} className="block text-end">
                    <span className="block">
                      {toPersianDigits(`${when.weekday} ${when.full}`)}
                    </span>
                    <span className="mt-0.5 block">
                      ساعت{' '}
                      <span dir="ltr" className="tabular-nums">
                        {times.map((time) => toPersianDigits(time)).join(' ، ')}
                      </span>
                    </span>
                  </span>
                )
              })}
              {slots.length > 1 ? (
                <span className="text-ink-400 block text-end text-[0.75rem]">
                  {toPersianDigits(bookingPage.datetime.selected(slots.length))}
                </span>
              ) : null}
            </span>
          </Row>
          <Row label={copy.name}>{details.name}</Row>

          {/* Deliberately heavier than the rest — see the note above. The flag
              and the international grouping are part of that: they turn a run
              of digits into something a person can actually check. */}
          <div className="border-line border-b py-3">
            <dt className="text-ink-400 text-[0.8125rem]">{copy.phone}</dt>
            <dd
              dir="ltr"
              className="text-ink-900 mt-1 flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-start text-[1rem] font-bold tracking-wide tabular-nums"
            >
              <Flag country={phoneCountry} loading="eager" className="h-4 w-[1.4rem]" />
              {formatPhone(details.phone)}
            </dd>
          </div>

          {/* Optional; an empty row saying so is just noise to read past. */}
          {details.email ? (
            <div className="border-line border-b py-3">
              <dt className="text-ink-400 text-[0.8125rem]">{copy.email}</dt>
              <dd
                dir="ltr"
                className="text-ink-900 mt-1 rounded-lg bg-white px-3 py-2 text-start text-[0.9375rem] font-bold"
              >
                {details.email}
              </dd>
            </div>
          ) : null}

          <Row label={copy.location}>{regionLabel}</Row>
          <Row label={copy.method}>{methodLabel}</Row>
        </dl>

        {/* The discount lives here rather than on the payment step: this is the
            only screen with a number on it, so applying a code has a visible
            effect instead of a bare confirmation message. */}
        <div className="border-line mt-4 rounded-2xl border bg-white/70 p-4">
          <label
            htmlFor="discount-code"
            className="text-ink-500 mb-2 block text-[0.75rem]"
          >
            {discountCopy.label}
          </label>
          <div className="flex gap-2">
            <input
              id="discount-code"
              type="text"
              dir="ltr"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={discountApplied}
              placeholder={discountCopy.placeholder}
              className="border-line text-ink-900 placeholder:text-ink-400/70 hover:border-line-strong w-full rounded-xl border bg-white px-4 py-2.5 text-start text-[0.8125rem] uppercase transition-colors focus:border-olive-400 focus:outline-none disabled:opacity-60"
            />
            {discountApplied ? (
              <button
                type="button"
                onClick={() => {
                  setCode('')
                  onClearDiscount()
                }}
                className="text-ink-500 hover:bg-sand-200 shrink-0 rounded-xl px-4 text-[0.75rem] transition-colors"
              >
                {discountCopy.remove}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onApplyDiscount(code)}
                className="shrink-0 rounded-xl bg-olive-700 px-5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-olive-800"
              >
                {discountCopy.apply}
              </button>
            )}
          </div>

          {quote?.discountError ? (
            <p role="alert" className="mt-2 text-[0.75rem] text-red-700">
              {quote.discountError}
            </p>
          ) : null}
          {discountApplied && !quote?.discountError ? (
            <p className="mt-2 text-[0.75rem] text-olive-700">{discountCopy.applied}</p>
          ) : null}
        </div>

        {/* An unpriced tier must not render as "۰ تومان", which reads like a
            free session rather than a missing setting. */}
        {quote?.notSet ? (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-[0.8125rem] leading-[1.9] text-amber-900">
            {bookingPage.summary.notSet}
          </p>
        ) : (
          <div className="border-line mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-ink-400 text-[0.8125rem]">{copy.total}</span>
            <span className="text-end">
              <span className="text-ink-900 text-[1.125rem] font-bold">
                {quote ? formatAmount(quote.payable, quote.currency) : '—'}
              </span>
              {discounted && quote ? (
                <span className="text-ink-400 mt-0.5 block text-[0.75rem] line-through">
                  {formatAmount(quote.base, quote.currency)}
                </span>
              ) : null}
            </span>
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting || quote === null || quote.notSet}
            className="inline-flex h-[3.125rem] items-center rounded-full bg-olive-700 px-7 text-sm font-medium text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800 disabled:opacity-60"
          >
            {submitting ? bookingPage.submitting : copy.confirm}
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={submitting}
            className="border-line-strong text-ink-700 h-[3.125rem] rounded-full border bg-white px-6 text-sm transition-colors hover:border-olive-400 disabled:opacity-60"
          >
            {copy.edit}
          </button>
        </div>
      </div>
    </div>
  )
}
