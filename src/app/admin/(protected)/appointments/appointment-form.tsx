'use client'

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react'
import {
  createAppointmentAction,
  slotsForDateAction,
  updateAppointmentAction,
  type AppointmentState,
} from './actions'
import { SubmitButton } from '@/components/admin/submit-button'
import { Field, Notice, inputClass } from '@/components/admin/ui'
import { JalaliCalendar } from '@/components/ui/jalali-calendar'
import { describeDate } from '@/lib/jalali'
import type { Appointment } from '@/server/appointments'
import { cn, toPersianDigits } from '@/lib/utils'

const initial: AppointmentState = {}

/** UTC-noon `Date` → `YYYY-MM-DD`, the shape the server action expects. */
const toIso = (date: Date) => date.toISOString().slice(0, 10)

export function AppointmentForm({
  services,
  appointment,
  onSuccess,
}: {
  services: readonly { id: string; title: string; durations: readonly number[] }[]
  /** Present when editing; omitted when creating. */
  appointment?: Appointment
  onSuccess?: () => void
}) {
  const editing = appointment != null

  // Bound once per appointment so useActionState keeps a stable reference.
  const action = useMemo(
    () =>
      appointment
        ? updateAppointmentAction.bind(null, appointment.id)
        : createAppointmentAction,
    [appointment]
  )

  const [state, formAction] = useActionState(action, initial)
  const [date, setDate] = useState<Date | null>(
    appointment ? new Date(`${appointment.scheduledOn}T12:00:00Z`) : null
  )
  const [time, setTime] = useState<string | null>(appointment?.scheduledAt ?? null)
  const [slots, setSlots] = useState<{ slot: string; taken: boolean }[]>([])
  const [loading, startLoading] = useTransition()

  const [serviceId, setServiceId] = useState(
    appointment?.serviceId ?? services[0]?.id ?? ''
  )
  // The stored length is folded in even if the service no longer offers it, so
  // a hypnotherapy session booked at 90 minutes still shows a control it can
  // be seen and changed from, instead of riding along in a hidden field.
  const offered = services.find((s) => s.id === serviceId)?.durations ?? [60]
  const durations = [
    ...new Set([
      ...offered,
      ...(appointment && appointment.serviceId === serviceId
        ? [appointment.durationMin]
        : []),
    ]),
  ].sort((a, b) => a - b)
  const [duration, setDuration] = useState(appointment?.durationMin ?? durations[0] ?? 60)

  // Availability depends on how long the session runs: a 120-minute session
  // needs starts that leave room for it, not the 60-minute grid.
  useEffect(() => {
    if (!date) {
      setSlots([])
      return
    }
    const iso = toIso(date)
    startLoading(async () =>
      setSlots(await slotsForDateAction(iso, appointment?.id, duration))
    )
  }, [date, duration, appointment?.id])

  useEffect(() => {
    if (state.success) onSuccess?.()
  }, [state.success, onSuccess])

  const label = date ? describeDate(date) : null

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* The date and time are chosen through the calendar, not typed. */}
      <input type="hidden" name="scheduledOn" value={date ? toIso(date) : ''} />
      <input type="hidden" name="scheduledAt" value={time ?? ''} />
      <input type="hidden" name="durationMin" value={duration} />

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}

      <fieldset>
        <legend className="text-ink-500 mb-2 text-[0.75rem]">نوع مشاوره</legend>
        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <label
              key={service.id}
              className="border-line has-checked:bg-sand-200 flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-[0.75rem] transition-colors has-checked:border-olive-600"
            >
              <input
                type="radio"
                name="serviceId"
                value={service.id}
                checked={serviceId === service.id}
                onChange={() => {
                  setServiceId(service.id)
                  // The new service may not offer the chosen length at all.
                  setDuration(service.durations[0] ?? 60)
                  setTime(null)
                }}
                required
                className="size-4 accent-olive-700"
              />
              {service.title}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Only worth asking when there is a choice; most services run 60. */}
      {durations.length > 1 ? (
        <fieldset>
          <legend className="text-ink-500 mb-2 text-[0.75rem]">مدت جلسه</legend>
          <div className="flex flex-wrap gap-2">
            {durations.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => {
                  setDuration(minutes)
                  setTime(null)
                }}
                aria-pressed={duration === minutes}
                className={cn(
                  'border-line rounded-xl border px-3.5 py-2.5 text-[0.75rem] transition-colors',
                  duration === minutes
                    ? 'bg-sand-200 text-ink-900 border-olive-600 font-semibold'
                    : 'text-ink-700 bg-white'
                )}
              >
                {toPersianDigits(minutes)} دقیقه
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-ink-500 mb-2 text-[0.75rem]">تاریخ (شمسی)</p>
          <JalaliCalendar
            value={date}
            // An existing appointment may already be in the past; its date
            // still has to be visible and reachable while editing.
            allowPast={editing}
            onChange={(next) => {
              setDate(next)
              setTime(null)
            }}
          />
        </div>

        <div>
          <p className="text-ink-500 mb-2 text-[0.75rem]">ساعت</p>
          <div className="border-line flex h-[calc(100%-1.75rem)] flex-col rounded-2xl border bg-white p-4">
            {label ? (
              <p className="text-ink-900 text-center text-[0.8125rem] font-semibold">
                {toPersianDigits(`${label.weekday} ${label.full}`)}
              </p>
            ) : (
              <p className="text-ink-400 text-center text-[0.75rem] leading-[1.9]">
                ابتدا یک روز را از تقویم انتخاب کنید.
              </p>
            )}

            <div className="mt-3 min-h-[7rem]">
              {loading ? (
                <p className="text-ink-400 py-6 text-center text-[0.75rem]">
                  در حال بررسی ساعت‌های آزاد…
                </p>
              ) : !date ? null : slots.length === 0 ? (
                <p className="text-ink-400 py-6 text-center text-[0.75rem] leading-[1.9]">
                  برای این روز ساعت کاری تعریف نشده است.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {slots.map(({ slot, taken }) => {
                    const selected = slot === time
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={taken}
                        onClick={() => setTime(slot)}
                        aria-pressed={selected}
                        title={taken ? 'رزرو شده' : undefined}
                        dir="ltr"
                        className={cn(
                          'border-line h-9 rounded-lg border text-[0.75rem] tabular-nums transition-all duration-200',
                          taken &&
                            'text-ink-400/50 bg-sand-100 cursor-default line-through',
                          !taken &&
                            !selected &&
                            'text-ink-700 bg-white hover:border-olive-400',
                          selected &&
                            'border-olive-700 bg-olive-700 font-semibold text-white'
                        )}
                      >
                        {toPersianDigits(slot)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی" htmlFor="fullName">
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            defaultValue={appointment?.fullName}
            className={inputClass}
          />
        </Field>

        <Field label="شماره تماس" htmlFor="phone">
          <input
            id="phone"
            name="phone"
            type="tel"
            dir="ltr"
            required
            defaultValue={appointment?.phone}
            placeholder="0912 345 6789"
            className={`${inputClass} text-start`}
          />
        </Field>
      </div>

      <Field label="ایمیل (اختیاری)" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          defaultValue={appointment?.email ?? ''}
          className={`${inputClass} text-start`}
        />
      </Field>

      <Field label="توضیحات (اختیاری)" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={appointment?.notes ?? ''}
          className={`${inputClass} resize-none`}
        />
      </Field>

      <div className="flex items-center gap-3">
        <SubmitButton
          pendingLabel={editing ? 'در حال ذخیره…' : 'در حال ثبت…'}
          disabled={!date || !time}
        >
          {editing ? 'ذخیره تغییرات' : 'ثبت نوبت'}
        </SubmitButton>
        {!date || !time ? (
          <span className="text-ink-400 text-[0.75rem]">
            تاریخ و ساعت را انتخاب کنید.
          </span>
        ) : null}
      </div>
    </form>
  )
}
