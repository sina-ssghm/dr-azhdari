'use client'

import { useActionState, useEffect, useState } from 'react'
import { saveDiscountAction, type DiscountState } from './actions'
import { ChoiceChips } from '@/components/admin/choice-chips'
import { MoneyInput } from '@/components/admin/money-input'
import { SubmitButton } from '@/components/admin/submit-button'
import { Field, Notice, inputClass } from '@/components/admin/ui'
import { JalaliDateField } from '@/components/ui/jalali-date-field'
import type { DiscountCode } from '@/server/discounts'

const initial: DiscountState = {}

const toIso = (date: Date) => date.toISOString().slice(0, 10)
const fromIso = (iso?: string | null) => (iso ? new Date(`${iso}T12:00:00Z`) : null)

const KINDS = [
  { value: 'percent', label: 'درصدی' },
  { value: 'fixed', label: 'مبلغ ثابت' },
] as const

export function DiscountForm({
  services,
  editing,
  onSuccess,
  onCancel,
}: {
  services: readonly { id: string; title: string }[]
  editing?: DiscountCode
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [state, action] = useActionState(saveDiscountAction, initial)
  const [kind, setKind] = useState<string>(editing?.kind ?? 'percent')
  const [expires, setExpires] = useState<Date | null>(fromIso(editing?.expiresOn))

  useEffect(() => {
    if (state.success) onSuccess?.()
  }, [state.success, onSuccess])

  return (
    <form action={action} className="flex flex-col gap-5">
      {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
      {/* Chosen through the calendar, not typed. */}
      <input type="hidden" name="expiresOn" value={expires ? toIso(expires) : ''} />

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="کد تخفیف" htmlFor="code" hint="فقط حروف انگلیسی، عدد، - و _">
          <input
            id="code"
            name="code"
            type="text"
            dir="ltr"
            required
            defaultValue={editing?.code}
            placeholder="NOWRUZ1405"
            className={`${inputClass} text-start uppercase`}
          />
        </Field>

        <Field label="حداکثر تعداد استفاده" htmlFor="maxUses" hint="خالی یعنی نامحدود">
          <input
            id="maxUses"
            name="maxUses"
            type="text"
            inputMode="numeric"
            dir="ltr"
            defaultValue={editing?.maxUses ?? ''}
            className={`${inputClass} text-start tabular-nums`}
          />
        </Field>
      </div>

      <ChoiceChips
        name="kind"
        legend="نوع تخفیف"
        options={KINDS}
        value={kind}
        onChange={setKind}
      />

      {kind === 'percent' ? (
        <Field label="درصد تخفیف" htmlFor="percent" hint="عددی بین ۱ تا ۱۰۰">
          <input
            id="percent"
            name="percent"
            type="text"
            inputMode="numeric"
            dir="ltr"
            required
            defaultValue={editing?.percent ?? ''}
            className={`${inputClass} text-start tabular-nums sm:max-w-40`}
          />
        </Field>
      ) : (
        // A fixed code needs a value in each currency, otherwise it would be
        // unusable for half the visitors.
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="مبلغ تخفیف — داخل ایران (تومان)" htmlFor="amountIrt">
            <MoneyInput
              id="amountIrt"
              name="amountIrt"
              defaultValue={editing?.amountIrt ?? ''}
              placeholder="500,000"
            />
          </Field>
          <Field label="مبلغ تخفیف — خارج از ایران (USDT)" htmlFor="amountUsdt">
            <MoneyInput
              id="amountUsdt"
              name="amountUsdt"
              decimals={2}
              defaultValue={editing?.amountUsdt ?? ''}
              placeholder="5.00"
            />
          </Field>
        </div>
      )}

      <div>
        <p className="text-ink-500 mb-2 text-[0.75rem]">تاریخ انقضا</p>
        <JalaliDateField
          value={expires}
          onChange={setExpires}
          placeholder="بدون انقضا"
          className="sm:max-w-64"
        />
        <p className="text-ink-400 mt-1.5 text-[0.6875rem]">خالی یعنی بدون انقضا</p>
      </div>

      <fieldset>
        <legend className="text-ink-500 mb-2 text-[0.75rem]">
          برای کدام خدمات معتبر باشد؟
        </legend>
        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <label
              key={service.id}
              className="border-line has-checked:bg-sand-200 flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-[0.75rem] transition-colors has-checked:border-olive-600"
            >
              <input
                type="checkbox"
                name="serviceIds"
                value={service.id}
                defaultChecked={editing?.serviceIds.includes(service.id)}
                className="size-4 accent-olive-700"
              />
              {service.title}
            </label>
          ))}
        </div>
        <p className="text-ink-400 mt-1.5 text-[0.6875rem]">
          اگر هیچ‌کدام را انتخاب نکنید، کد برای همه خدمات معتبر خواهد بود.
        </p>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2.5 text-[0.8125rem]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={editing ? editing.isActive : true}
          className="size-4 accent-olive-700"
        />
        فعال باشد
      </label>

      <div className="flex flex-wrap gap-2">
        <SubmitButton>{editing ? 'ذخیره تغییرات' : 'افزودن کد'}</SubmitButton>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-ink-500 hover:bg-sand-200 h-11 rounded-full px-5 text-[0.8125rem] transition-colors"
          >
            انصراف
          </button>
        ) : null}
      </div>
    </form>
  )
}
