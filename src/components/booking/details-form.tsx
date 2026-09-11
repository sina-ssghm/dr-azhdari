'use client'

import type { ChangeEvent } from 'react'
import { Panel } from '@/components/booking/panel'
import { PhoneField } from '@/components/booking/phone-field'
import { bookingPage } from '@/content/booking-page'

export type Details = {
  name: string
  /** E.164, e.g. `+989123456789`. */
  phone: string
  email: string
  notes: string
}

const field =
  'border-line w-full rounded-xl border bg-white/70 px-4 py-3 text-[0.8125rem] text-ink-900 ' +
  'placeholder:text-ink-400/70 transition-colors duration-200 ' +
  'hover:border-line-strong focus:border-olive-400 focus:bg-white focus:outline-none'

export function DetailsForm({
  value,
  onChange,
}: {
  value: Details
  onChange: (next: Details) => void
}) {
  const { title, description, fields } = bookingPage.details

  const update =
    (key: keyof Details) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const raw = event.target.value
      // Phone numbers accept only digits and a leading +; stripping as they
      // type prevents spaces and dashes reaching the server at all.
      const next =
        key === 'phone' ? raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '') : raw
      onChange({ ...value, [key]: next })
    }

  return (
    <Panel title={title} description={description}>
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="booking-name"
            className="text-ink-500 mb-2 block text-[0.75rem]"
          >
            {fields.name.label}
          </label>
          <input
            id="booking-name"
            name="name"
            type="text"
            autoComplete="name"
            className={field}
            placeholder={fields.name.placeholder}
            value={value.name}
            onChange={update('name')}
          />
        </div>

        <div>
          <label
            htmlFor="booking-phone"
            className="text-ink-500 mb-2 block text-[0.75rem]"
          >
            {fields.phone.label}
          </label>
          <PhoneField
            value={value.phone}
            onChange={(phone) => onChange({ ...value, phone })}
          />
        </div>

        <div>
          <label
            htmlFor="booking-email"
            className="text-ink-500 mb-2 block text-[0.75rem]"
          >
            {fields.email.label}
          </label>
          <input
            id="booking-email"
            name="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            className={`${field} text-start`}
            placeholder={fields.email.placeholder}
            value={value.email}
            onChange={update('email')}
          />
        </div>

        <div>
          <label
            htmlFor="booking-notes"
            className="text-ink-500 mb-2 block text-[0.75rem]"
          >
            {fields.notes.label}
          </label>
          <textarea
            id="booking-notes"
            name="notes"
            rows={3}
            className={`${field} resize-none leading-[1.9]`}
            placeholder={fields.notes.placeholder}
            value={value.notes}
            onChange={update('notes')}
          />
        </div>
      </div>
    </Panel>
  )
}
