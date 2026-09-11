'use client'

import { useActionState } from 'react'
import { savePricesAction, type PricesState } from './actions'
import { MoneyInput } from '@/components/admin/money-input'
import { SubmitButton } from '@/components/admin/submit-button'
import { Field, Notice } from '@/components/admin/ui'
import { admin } from '@/content/admin'
import { bookingPage } from '@/content/booking-page'
import type { DurationPrice } from '@/server/settings'
import { toPersianDigits } from '@/lib/utils'

const initial: PricesState = {}

export function PricesForm({
  tiers,
  prices,
}: {
  tiers: readonly { serviceId: string; title: string; durationMin: number }[]
  prices: DurationPrice[]
}) {
  const [state, action] = useActionState(savePricesAction, initial)

  const priceFor = (serviceId: string, durationMin: number) =>
    prices.find((p) => p.serviceId === serviceId && p.durationMin === durationMin)

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.success ? <Notice tone="success">{admin.saved}</Notice> : null}

      {/* One card per (service, duration) — couple therapy is priced
          separately at 90 and 120 minutes. */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier) => {
          const suffix = `${tier.serviceId}_${tier.durationMin}`
          const price = priceFor(tier.serviceId, tier.durationMin)

          return (
            <section key={suffix} className="bg-sand-100 rounded-2xl p-4">
              <h2 className="text-ink-900 text-[0.8125rem] font-bold">{tier.title}</h2>
              <p className="text-ink-400 mt-1 text-[0.6875rem]">
                {toPersianDigits(bookingPage.duration.label(tier.durationMin))}
              </p>

              <div className="mt-3 flex flex-col gap-3">
                <Field label="کارت به کارت داخل ایران (تومان)" htmlFor={`irt_${suffix}`}>
                  <MoneyInput
                    id={`irt_${suffix}`}
                    name={`irt_${suffix}`}
                    defaultValue={price?.priceIrt ?? 0}
                    placeholder="2,500,000"
                  />
                </Field>

                <Field
                  label="کارت به کارت خارج از ایران (تومان)"
                  htmlFor={`irtAbroad_${suffix}`}
                  // Seeded from the domestic tariff by the migration, so an
                  // untouched one is indistinguishable from a deliberate match.
                  hint={
                    price && price.priceIrtAbroad === price.priceIrt
                      ? 'برابر با تعرفه داخل ایران است — در صورت نیاز تغییر دهید.'
                      : undefined
                  }
                >
                  <MoneyInput
                    id={`irtAbroad_${suffix}`}
                    name={`irtAbroad_${suffix}`}
                    defaultValue={price?.priceIrtAbroad ?? 0}
                    placeholder="3,000,000"
                  />
                </Field>

                <Field label="تتر — خارج از ایران (USDT)" htmlFor={`usdt_${suffix}`}>
                  <MoneyInput
                    id={`usdt_${suffix}`}
                    name={`usdt_${suffix}`}
                    decimals={2}
                    defaultValue={price?.priceUsdt ?? 0}
                    placeholder="35.00"
                  />
                </Field>
              </div>
            </section>
          )
        })}
      </div>

      <div>
        <SubmitButton>{admin.save}</SubmitButton>
      </div>
    </form>
  )
}
