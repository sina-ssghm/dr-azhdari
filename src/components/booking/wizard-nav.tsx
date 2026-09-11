'use client'

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { bookingPage } from '@/content/booking-page'
import { cn } from '@/lib/utils'

/**
 * Back / next for the booking wizard.
 *
 * The chevrons point along the reading direction: in RTL, "forward" is left.
 */
export function WizardNav({
  step,
  lastStep,
  canAdvance,
  onBack,
  onNext,
}: {
  step: number
  lastStep: number
  canAdvance: boolean
  onBack: () => void
  onNext: () => void
}) {
  const { next, back, toReview } = bookingPage.nav

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      {step > 0 ? (
        <button
          type="button"
          onClick={onBack}
          className="border-line-strong text-ink-700 inline-flex h-[3.125rem] items-center gap-2 rounded-full border bg-white px-6 text-[0.875rem] transition-colors hover:border-olive-400"
        >
          <ChevronRightIcon className="size-4" />
          {back}
        </button>
      ) : (
        <span />
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!canAdvance}
        className={cn(
          'inline-flex h-[3.125rem] items-center gap-2 rounded-full px-7 text-[0.875rem] font-medium',
          'bg-olive-700 text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800',
          'disabled:pointer-events-none disabled:opacity-50'
        )}
      >
        {step === lastStep ? toReview : next}
        <ChevronLeftIcon className="size-4" />
      </button>
    </div>
  )
}
