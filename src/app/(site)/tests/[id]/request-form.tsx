'use client'

import { useActionState, useState } from 'react'
import { requestTestAction, type RequestState } from './actions'
import { PhoneField } from '@/components/booking/phone-field'
import { SpinnerIcon } from '@/components/icons'
import { testsPage } from '@/content/tests-page'
import { cn, formatPrice } from '@/lib/utils'

const initial: RequestState = {}

const fieldClass =
  'border-line w-full rounded-xl border bg-white px-4 py-3 text-[0.875rem] text-ink-900 ' +
  'placeholder:text-ink-400/70 transition-colors hover:border-line-strong ' +
  'focus:border-olive-400 focus:outline-none'

/**
 * Collects who is taking the test and where they are.
 *
 * Where they are decides the currency, so it is asked before any price is
 * quoted rather than after — a visitor abroad should never be shown a toman
 * figure they are not going to pay.
 */
export function RequestForm({
  testId,
  priceIrt,
  priceUsdt,
}: {
  testId: string
  priceIrt: number
  priceUsdt: number
}) {
  const [state, action, pending] = useActionState(requestTestAction, initial)
  const [region, setRegion] = useState<'iran' | 'abroad'>('iran')
  const [phone, setPhone] = useState('')
  const copy = testsPage.detail

  const amount = region === 'iran' ? priceIrt : priceUsdt
  const free = amount <= 0

  /**
   * Whether the answer could change anything.
   *
   * Asking where somebody lives is only ever a way of picking a currency, so a
   * test that costs nothing either way should not ask. It stays for a test
   * that is free in Iran but priced in USDT abroad, where the answer is what
   * decides that.
   */
  const regionMatters = priceIrt > 0 || priceUsdt > 0

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="testId" value={testId} />
      <input type="hidden" name="region" value={region} />
      <input type="hidden" name="phone" value={phone} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="test-name" className="text-ink-500 mb-2 block text-[0.8125rem]">
          {copy.name}
        </label>
        <input
          id="test-name"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="test-phone" className="text-ink-500 mb-2 block text-[0.8125rem]">
          {copy.phone}
        </label>
        <PhoneField id="test-phone" value={phone} onChange={setPhone} />
      </div>

      <div>
        <label htmlFor="test-email" className="text-ink-500 mb-2 block text-[0.8125rem]">
          {copy.email}
        </label>
        <input
          id="test-email"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          className={`${fieldClass} text-start`}
        />
      </div>

      {regionMatters ? (
        <fieldset>
          <legend className="text-ink-500 mb-2 text-[0.8125rem]">{copy.region}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['iran', copy.iran],
                ['abroad', copy.abroad],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRegion(id)}
                aria-pressed={region === id}
                className={cn(
                  'rounded-xl border px-4 py-3 text-[0.8125rem] transition-colors',
                  region === id
                    ? 'border-olive-600 bg-olive-50 font-medium text-olive-800'
                    : 'border-line text-ink-500 hover:border-line-strong bg-white'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-ink-400 mt-1.5 text-[0.6875rem]">{copy.regionHint}</p>
        </fieldset>
      ) : null}

      <p className="border-line flex items-center justify-between border-t pt-4">
        <span className="text-ink-400 text-[0.8125rem]">{copy.price}</span>
        <span className="text-ink-900 text-[1.0625rem] font-bold">
          {formatPrice(amount, region === 'iran' ? 'IRT' : 'USDT')}
        </span>
      </p>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-full bg-olive-700 px-7 text-sm font-medium text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800 disabled:opacity-60"
      >
        {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
        {pending ? copy.saving : free ? copy.submitFree : copy.submit}
      </button>
    </form>
  )
}
