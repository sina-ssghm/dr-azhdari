'use client'

import { useActionState } from 'react'
import { saveTestPricesAction, type PricesState } from './actions'
import { MoneyInput } from '@/components/admin/money-input'
import { SubmitButton } from '@/components/admin/submit-button'
import { Card, Notice } from '@/components/admin/ui'
import { TESTS } from '@/content/tests'
import { admin } from '@/content/admin'
import type { TestPrice } from '@/server/tests'
import { toPersianDigits } from '@/lib/utils'

const initial: PricesState = {}

export function TestPricesForm({ prices }: { prices: TestPrice[] }) {
  const [state, action] = useActionState(saveTestPricesAction, initial)
  const byId = new Map(prices.map((price) => [price.testId, price]))

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.success ? <Notice tone="success">{admin.saved}</Notice> : null}

      <Card
        title="تعرفه آزمون‌ها"
        description="تومان برای مراجعان داخل ایران و تتر برای خارج از ایران. مبلغ صفر یعنی آزمون رایگان است و بلافاصله پس از ثبت نام، لینک آزمون صادر می‌شود."
      >
        <div className="flex flex-col gap-3">
          {TESTS.map((test) => {
            const price = byId.get(test.id)
            return (
              <div
                key={test.id}
                className="border-line grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[1fr_10rem_9rem_auto] sm:items-end"
              >
                <div className="min-w-0 sm:pb-2">
                  <p className="text-ink-900 text-[0.8125rem] font-medium">
                    {test.short}
                  </p>
                  <p className="text-ink-400 mt-1 text-[0.6875rem]">
                    {toPersianDigits(test.questions.length)} سؤال ·{' '}
                    {toPersianDigits(test.minutes)} دقیقه
                  </p>
                </div>

                {/* Labelled on every row rather than once in a header: the rows
                    wrap into a single column on a phone, where a column header
                    would be nowhere near the field it names. */}
                <label className="block">
                  <span className="text-ink-400 mb-1.5 block text-[0.6875rem]">
                    داخل ایران (تومان)
                  </span>
                  <MoneyInput
                    name={`irt_${test.id}`}
                    defaultValue={price?.priceIrt ?? 0}
                    placeholder="۰"
                  />
                </label>

                <label className="block">
                  <span className="text-ink-400 mb-1.5 block text-[0.6875rem]">
                    خارج ایران (تتر)
                  </span>
                  <MoneyInput
                    name={`usdt_${test.id}`}
                    defaultValue={price?.priceUsdt ?? 0}
                    decimals={2}
                    placeholder="۰"
                  />
                </label>

                <label className="text-ink-500 flex shrink-0 items-center gap-2 text-[0.75rem] sm:pb-2.5">
                  <input
                    type="checkbox"
                    name={`enabled_${test.id}`}
                    defaultChecked={price?.enabled ?? true}
                    className="size-4 accent-[var(--color-olive-700)]"
                  />
                  فعال
                </label>
              </div>
            )
          })}
        </div>
      </Card>

      <div>
        <SubmitButton>{admin.save}</SubmitButton>
      </div>
    </form>
  )
}
