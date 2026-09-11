'use client'

import { useActionState, useState } from 'react'
import {
  deleteTestimonialAction,
  editTestimonialAction,
  setStatusAction,
  type EditState,
} from './actions'
import { ActionButton } from '@/components/admin/action-button'
import { Modal } from '@/components/admin/modal'
import { OverflowMenu } from '@/components/admin/overflow-menu'
import { SubmitButton } from '@/components/admin/submit-button'
import { Badge, inputClass, Notice } from '@/components/admin/ui'
import { Flag } from '@/components/ui/flag'
import { NAME_MAX, QUOTE_MAX } from '@/content/testimonials'
import { COUNTRIES } from '@/lib/phone'
import type { StoredTestimonial } from '@/server/testimonials'
import { toPersianDigits } from '@/lib/utils'

const statuses = {
  pending: { label: 'در انتظار بررسی', tone: 'amber' },
  approved: { label: 'منتشر شده', tone: 'green' },
  rejected: { label: 'رد شده', tone: 'red' },
} as const

const initial: EditState = {}

export function TestimonialRow({ item }: { item: StoredTestimonial }) {
  const [editing, setEditing] = useState(false)
  const [state, action] = useActionState(editTestimonialAction, initial)

  const status = statuses[item.status]
  const country = item.countryCode
    ? COUNTRIES.find((entry) => entry.code === item.countryCode)
    : undefined

  const submitted = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(
    new Date(item.createdAt)
  )

  return (
    <li className="border-line rounded-xl border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-ink-900 flex flex-wrap items-center gap-2 text-[0.875rem] font-medium">
            {item.name}
            {country ? (
              <span className="text-ink-400 flex items-center gap-1.5 text-[0.75rem] font-normal">
                <Flag country={country} className="h-[0.7rem] w-4" decorative />
                {country.name}
              </span>
            ) : null}
          </p>
          <p className="text-ink-400 mt-1 text-[0.6875rem]">
            {toPersianDigits(submitted)}
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <p className="text-ink-700 border-line border-t px-4 py-3 text-[0.8125rem] leading-[2]">
        {item.quote}
      </p>

      <div className="border-line flex flex-wrap items-center gap-1 border-t px-3 py-2">
        {item.status !== 'approved' ? (
          <ActionButton
            tone="positive"
            onAction={() => setStatusAction(item.id, 'approved')}
          >
            تأیید و انتشار
          </ActionButton>
        ) : null}

        {item.status !== 'rejected' ? (
          <ActionButton
            tone="danger"
            onAction={() => setStatusAction(item.id, 'rejected')}
            confirm={{
              title: 'رد نظر',
              body: 'این نظر از سایت برداشته می‌شود. می‌توانید بعداً دوباره تأییدش کنید.',
              confirmLabel: 'رد کن',
            }}
          >
            رد
          </ActionButton>
        ) : null}

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-ink-500 hover:bg-sand-200 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors"
        >
          ویرایش
        </button>

        <OverflowMenu>
          {item.status === 'approved' ? (
            <ActionButton
              tone="neutral"
              onAction={() => setStatusAction(item.id, 'pending')}
            >
              بازگرداندن به بررسی
            </ActionButton>
          ) : null}
          <ActionButton
            tone="danger"
            onAction={() => deleteTestimonialAction(item.id)}
            confirm={{
              title: 'حذف نظر',
              body: 'این نظر برای همیشه حذف می‌شود.',
              confirmLabel: 'حذف کن',
            }}
          >
            حذف
          </ActionButton>
        </OverflowMenu>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="ویرایش نظر"
        description="متن، نام و کشور را می‌توانید پیش از انتشار اصلاح کنید."
      >
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={item.id} />

          {state.error ? <Notice tone="error">{state.error}</Notice> : null}
          {state.success ? <Notice tone="success">تغییرات ذخیره شد.</Notice> : null}

          <div>
            <label
              htmlFor={`name-${item.id}`}
              className="text-ink-500 mb-2 block text-[0.75rem]"
            >
              نام
            </label>
            <input
              id={`name-${item.id}`}
              name="name"
              type="text"
              maxLength={NAME_MAX}
              defaultValue={item.name}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor={`country-${item.id}`}
              className="text-ink-500 mb-2 block text-[0.75rem]"
            >
              کشور
            </label>
            {/* A native select: 250 options with type-ahead for free, and this
                page is opened by one person on a desktop. */}
            <select
              id={`country-${item.id}`}
              name="country"
              defaultValue={item.countryCode ?? ''}
              className={inputClass}
            >
              <option value="">— بدون کشور —</option>
              {COUNTRIES.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`quote-${item.id}`}
              className="text-ink-500 mb-2 block text-[0.75rem]"
            >
              متن نظر
            </label>
            <textarea
              id={`quote-${item.id}`}
              name="quote"
              rows={7}
              maxLength={QUOTE_MAX}
              defaultValue={item.quote}
              className={`${inputClass} resize-y leading-[2]`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <SubmitButton>ذخیره تغییرات</SubmitButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-ink-500 hover:bg-sand-200 rounded-full px-5 py-2.5 text-[0.8125rem] transition-colors"
            >
              بستن
            </button>
          </div>
        </form>
      </Modal>
    </li>
  )
}
