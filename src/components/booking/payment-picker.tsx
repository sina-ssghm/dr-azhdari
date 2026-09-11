'use client'

import {
  CheckIcon,
  CreditCardIcon,
  GlobeIcon,
  IranFlagIcon,
  TetherIcon,
} from '@/components/icons'
import { Panel } from '@/components/booking/panel'
import { bookingPage, type PaymentRegion } from '@/content/booking-page'
import type { PaymentId } from '@/lib/payment'
import { cn } from '@/lib/utils'

/**
 * Where the client is, and then how they want to pay.
 *
 * Two questions rather than one: inside Iran there is only card-to-card, while
 * from abroad the same session can be paid in tether or by card to an Iranian
 * account — at a different price. Asking for the region first is what makes
 * that second choice make sense.
 *
 * No amounts here on purpose. They belong on the review screen, where the
 * whole booking is priced once and confirmed.
 */
export function PaymentPicker({
  region,
  method,
  error,
  onRegionChange,
  onMethodChange,
}: {
  region: PaymentRegion | null
  method: PaymentId | null
  error: string | null
  onRegionChange: (region: PaymentRegion) => void
  onMethodChange: (method: PaymentId) => void
}) {
  const copy = bookingPage.payment
  const chosenRegion = copy.regions.find((r) => r.id === region)
  const methods = copy.methods.filter((m) => m.region === region)

  const Choice = ({
    selected,
    title,
    subtitle,
    icon,
    onSelect,
  }: {
    selected: boolean
    title: string
    subtitle: string
    icon: React.ReactNode
    onSelect: () => void
  }) => (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-2xl border p-4 text-start',
        'transition-all duration-300 ease-[var(--ease-out-soft)]',
        selected
          ? 'bg-sand-200 border-olive-600'
          : 'border-line hover:border-line-strong bg-white/70 hover:bg-white'
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center">{icon}</span>

      <span className="min-w-0 flex-1">
        <span className="text-ink-900 block text-[0.875rem] font-semibold">{title}</span>
        <span className="text-ink-400 mt-1 block text-[0.75rem] leading-[1.85]">
          {subtitle}
        </span>
      </span>

      <span
        aria-hidden="true"
        className={cn(
          'grid size-[1.375rem] shrink-0 place-items-center rounded-full border transition-all duration-300',
          selected
            ? 'border-olive-700 bg-olive-700 text-white'
            : 'border-line-strong text-transparent'
        )}
      >
        <CheckIcon className="size-3" />
      </span>
    </button>
  )

  return (
    <Panel
      title={region === null ? copy.title : copy.methodTitle}
      description={region === null ? copy.description : undefined}
    >
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800"
        >
          {error}
        </p>
      ) : null}

      {region === null ? (
        <div role="radiogroup" aria-label={copy.title} className="flex flex-col gap-2.5">
          {copy.regions.map((option) => (
            <Choice
              key={option.id}
              selected={false}
              title={option.title}
              subtitle={option.subtitle}
              onSelect={() => onRegionChange(option.id)}
              icon={
                option.id === 'iran' ? (
                  <IranFlagIcon className="h-[1.15rem] w-[1.7rem] rounded-[3px]" />
                ) : (
                  <GlobeIcon className="text-ink-700 size-6" strokeWidth={1.3} />
                )
              }
            />
          ))}
        </div>
      ) : (
        <>
          <div className="border-line mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white/70 px-4 py-3">
            <span className="text-ink-700 inline-flex items-center gap-2 text-[0.8125rem] font-medium">
              {region === 'iran' ? (
                <IranFlagIcon className="h-[0.95rem] w-[1.4rem] rounded-[3px]" />
              ) : (
                <GlobeIcon className="text-ink-700 size-[1.05rem]" strokeWidth={1.4} />
              )}
              {chosenRegion?.title}
            </span>
            <button
              type="button"
              onClick={() => onRegionChange(region === 'iran' ? 'abroad' : 'iran')}
              className="text-ink-500 hover:bg-sand-200 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors"
            >
              {copy.changeRegion}
            </button>
          </div>

          <div
            role="radiogroup"
            aria-label={copy.methodTitle}
            className="flex flex-col gap-2.5"
          >
            {methods.map((option) => (
              <Choice
                key={option.id}
                selected={option.id === method}
                title={option.title}
                subtitle={option.subtitle}
                onSelect={() => onMethodChange(option.id)}
                icon={
                  option.id === 'abroad_crypto' ? (
                    <TetherIcon className="size-9" />
                  ) : (
                    <span className="border-line grid size-10 place-items-center rounded-xl border bg-white">
                      <CreditCardIcon className="text-ink-700 size-5" strokeWidth={1.3} />
                    </span>
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}
