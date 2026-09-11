'use client'

import { useActionState } from 'react'
import { changePasswordAction, type PasswordState } from './actions'
import { SubmitButton } from '@/components/admin/submit-button'
import { Card, Field, Notice, inputClass } from '@/components/admin/ui'

const initial: PasswordState = {}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initial)

  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        {state.error ? <Notice tone="error">{state.error}</Notice> : null}
        {state.success ? (
          <Notice tone="success">
            رمز عبور تغییر کرد. سایر دستگاه‌هایی که وارد شده بودند از حساب خارج شدند.
          </Notice>
        ) : null}

        <Field label="رمز عبور فعلی" htmlFor="current">
          <input
            id="current"
            name="current"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            required
            className={`${inputClass} text-start`}
          />
        </Field>

        <Field
          label="رمز عبور جدید"
          htmlFor="next"
          hint="حداقل ۸ کاراکتر. ترکیبی از حرف، عدد و نماد امن‌تر است."
        >
          <input
            id="next"
            name="next"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            required
            minLength={8}
            className={`${inputClass} text-start`}
          />
        </Field>

        <Field label="تکرار رمز عبور جدید" htmlFor="confirm">
          <input
            id="confirm"
            name="confirm"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            required
            className={`${inputClass} text-start`}
          />
        </Field>

        <div>
          <SubmitButton pendingLabel="در حال تغییر…">تغییر رمز عبور</SubmitButton>
        </div>
      </form>
    </Card>
  )
}
