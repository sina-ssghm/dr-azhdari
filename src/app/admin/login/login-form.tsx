'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/admin/submit-button'
import { Field, Notice, inputClass } from '@/components/admin/ui'
import { loginAction, type LoginState } from '@/app/admin/actions'

const initial: LoginState = {}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initial)

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}

      <Field label="نام کاربری" htmlFor="username">
        <input
          id="username"
          name="username"
          type="text"
          inputMode="tel"
          dir="ltr"
          autoComplete="username"
          required
          className={`${inputClass} text-start`}
          placeholder="09xxxxxxxxx"
        />
      </Field>

      <Field label="رمز عبور" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
          className={`${inputClass} text-start`}
          placeholder="••••••••"
        />
      </Field>

      <SubmitButton pendingLabel="در حال ورود…" className="mt-2 w-full">
        ورود
      </SubmitButton>
    </form>
  )
}
