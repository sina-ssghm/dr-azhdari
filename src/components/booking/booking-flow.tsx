'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import {
  quoteBookingAction,
  submitBookingAction,
  type Quote,
} from '@/app/(site)/booking/actions'
import { LockIcon } from '@/components/icons'
import { BookingSteps } from '@/components/booking/booking-steps'
import { DateTimePicker } from '@/components/booking/date-time-picker'
import { DetailsForm, type Details } from '@/components/booking/details-form'
import { PaymentPicker } from '@/components/booking/payment-picker'
import { ReviewPanel } from '@/components/booking/review-panel'
import { ServicePicker } from '@/components/booking/service-picker'
import { WizardNav } from '@/components/booking/wizard-nav'
import { Container } from '@/components/ui/container'
import { bookingPage, type PaymentRegion, type ServiceId } from '@/content/booking-page'
import type { PaymentId } from '@/lib/payment'
import { isValidPhone } from '@/lib/phone'

const EMPTY_DETAILS: Details = { name: '', phone: '', email: '', notes: '' }

const LAST_STEP = 3
const REVIEW = 4

/** Clears the floating header when a new step is scrolled into view. */
const HEADER_CLEARANCE = 110

/**
 * The booking wizard: one question per screen.
 *
 * Each step has a gate, and the gates double as the progress indicator's
 * completion state. Nothing is written until the review screen, which is also
 * the only place a price appears.
 */
export function BookingFlow({ openWeekdays }: { openWeekdays: number[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState(0)

  const [service, setService] = useState<ServiceId | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [times, setTimes] = useState<string[]>([])
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS)
  const [region, setRegion] = useState<PaymentRegion | null>(null)
  const [method, setMethod] = useState<PaymentId | null>(null)

  const [discountCode, setDiscountCode] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  /** One gate per step, in step order. */
  const gates = [
    service !== null && duration !== null,
    date !== null && times.length > 0,
    details.name.trim().length >= 2 && isValidPhone(details.phone),
    method !== null,
  ]

  const gateErrors = [
    service === null ? bookingPage.incomplete.service : bookingPage.incomplete.duration,
    bookingPage.incomplete.datetime,
    bookingPage.incomplete.details,
    bookingPage.incomplete.method,
  ]

  // Priced on the server whenever anything affecting the total moves. The
  // browser never receives the tariff table, so it cannot show a stale price.
  useEffect(() => {
    if (step !== REVIEW || !service || !duration || !method) return
    let live = true
    void quoteBookingAction({
      serviceId: service,
      durationMin: duration,
      sessions: times.length,
      paymentMethod: method,
      discountCode,
    }).then((next) => {
      if (live) setQuote(next)
    })
    return () => {
      live = false
    }
  }, [step, service, duration, times.length, method, discountCode])

  /**
   * Put the new step at the top of the screen.
   *
   * In an effect rather than in the click handler: `setStep` has not rendered
   * yet at that point, so the scroll was measured against the outgoing panel
   * and — when the next step was the shorter one — the document shrank under
   * an in-flight smooth scroll and the browser clamped it back.
   *
   * Skips the first render; landing on the page should not move it.
   */
  const settled = useRef(false)
  useLayoutEffect(() => {
    if (!settled.current) {
      settled.current = true
      return
    }
    const box = formRef.current?.getBoundingClientRect()
    if (!box) return
    const gentle = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({
      top: Math.max(0, box.top + window.scrollY - HEADER_CLEARANCE),
      behavior: gentle ? 'smooth' : 'auto',
    })
  }, [step])

  const goNext = () => {
    if (!gates[step]) return setError(gateErrors[step] ?? null)
    setError(null)
    setStep((value) => Math.min(value + 1, REVIEW))
  }

  const goBack = () => {
    setError(null)
    setStep((value) => Math.max(value - 1, 0))
  }

  /** Backwards only — jumping over an unmet gate is how review gets reached half-filled. */
  const goTo = (target: number) => {
    if (target >= step) return
    setError(null)
    setStep(target)
  }

  const confirm = () => {
    // Re-checked, because a visitor can step back and empty a field after
    // having passed its gate on the way through.
    const failed = gates.findIndex((ok) => !ok)
    if (failed !== -1) {
      setError(gateErrors[failed] ?? null)
      return setStep(failed)
    }
    if (!service || !duration || !date || !method) return

    setError(null)
    setSubmitting(true)

    startTransition(async () => {
      const result = await submitBookingAction({
        serviceId: service,
        durationMin: duration,
        date: date.toISOString().slice(0, 10),
        times,
        fullName: details.name,
        phone: details.phone,
        email: details.email,
        notes: details.notes,
        paymentMethod: method,
        discountCode,
      })

      setSubmitting(false)
      if (!result.ok) return setError(result.error)
      router.push(`/booking/${result.ref}/pay`)
    })
  }

  const panels = [
    <ServicePicker
      key="service"
      value={service}
      duration={duration}
      onChange={(nextService) => {
        setService(nextService)
        // Both the length and the free hours depend on the service.
        const option = bookingPage.service.options.find((o) => o.id === nextService)
        setDuration(option?.durations.length === 1 ? option.durations[0]! : null)
        setTimes([])
        setDiscountCode('')
      }}
      onDurationChange={(minutes) => {
        setDuration(minutes)
        setTimes([])
      }}
    />,
    <DateTimePicker
      key="datetime"
      date={date}
      times={times}
      durationMin={duration}
      openWeekdays={openWeekdays}
      onSelectDate={(nextDate) => {
        setDate(nextDate)
        setTimes([])
      }}
      onToggleTime={(time) =>
        setTimes((prev) =>
          prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time].sort()
        )
      }
    />,
    <DetailsForm key="details" value={details} onChange={setDetails} />,
    <PaymentPicker
      key="payment"
      region={region}
      method={method}
      error={null}
      onRegionChange={(nextRegion) => {
        setRegion(nextRegion)
        // Inside Iran there is only one way to pay, so do not ask twice.
        setMethod(nextRegion === 'iran' ? 'iran_card' : null)
      }}
      onMethodChange={setMethod}
    />,
  ]

  return (
    <section className="bg-sand-50 pt-32 pb-20 lg:pt-40 lg:pb-28">
      <Container>
        <header className="flex flex-col items-center text-center">
          <h1 className="font-display text-[1.875rem] font-bold text-olive-700 lg:text-[2.25rem]">
            {bookingPage.title}
          </h1>
          <p className="text-ink-400 mt-3 text-[0.875rem]">{bookingPage.subtitle}</p>
        </header>

        <div ref={formRef} className="mt-10 lg:mt-12">
          <BookingSteps completed={gates} current={step} onJump={goTo} />
        </div>

        {step === REVIEW && service && duration && date && method ? (
          <ReviewPanel
            serviceId={service}
            durationMin={duration}
            date={date}
            times={times}
            details={details}
            method={method}
            quote={quote}
            discountApplied={discountCode !== '' && !quote?.discountError}
            submitting={submitting}
            error={error}
            onApplyDiscount={setDiscountCode}
            onClearDiscount={() => setDiscountCode('')}
            onEdit={() => setStep(LAST_STEP)}
            onConfirm={confirm}
          />
        ) : (
          <div className="mx-auto mt-10 max-w-xl lg:mt-12">
            {panels[step]}

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800"
              >
                {error}
              </p>
            ) : !gates[step] ? (
              // The next button is disabled until the step is complete, which
              // on its own just looks broken. Say what is still missing.
              <p className="text-ink-400 mt-4 text-center text-[0.75rem]">
                {gateErrors[step]}
              </p>
            ) : null}

            <WizardNav
              step={step}
              lastStep={LAST_STEP}
              canAdvance={gates[step] ?? false}
              onBack={goBack}
              onNext={goNext}
            />

            <p className="bg-sand-100 text-ink-500 mt-4 flex items-center justify-center gap-3 rounded-[var(--radius-card)] px-6 py-5 text-center text-[0.8125rem] leading-[1.9]">
              <LockIcon className="size-[1.05rem] shrink-0 text-olive-700" />
              {bookingPage.notice}
            </p>
          </div>
        )}
      </Container>
    </section>
  )
}
