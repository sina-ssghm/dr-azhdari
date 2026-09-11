'use client'

import { useActionState, useState } from 'react'
import { saveHoursAction, type HoursState } from './actions'
import { CloseIcon } from '@/components/icons'
import { SubmitButton } from '@/components/admin/submit-button'
import { TimeField } from '@/components/admin/time-field'
import { Notice } from '@/components/admin/ui'
import { admin } from '@/content/admin'
import type { WorkingHour } from '@/server/settings'

type Span = { key: string; starts: string; ends: string }
type Week = Record<number, Span[]>

const initial: HoursState = {}

let counter = 0
const nextKey = () => `span-${(counter += 1)}`

function toWeek(hours: WorkingHour[]): Week {
  const week: Week = {}
  for (let day = 0; day < 7; day += 1) week[day] = []
  for (const hour of hours) {
    week[hour.weekday]?.push({ key: nextKey(), starts: hour.starts, ends: hour.ends })
  }
  return week
}

export function HoursEditor({ hours }: { hours: WorkingHour[] }) {
  const [state, action] = useActionState(saveHoursAction, initial)
  const [week, setWeek] = useState<Week>(() => toWeek(hours))

  const update = (day: number, key: string, patch: Partial<Span>) =>
    setWeek((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }))

  const add = (day: number) =>
    setWeek((prev) => ({
      ...prev,
      [day]: [...(prev[day] ?? []), { key: nextKey(), starts: '09:00', ends: '13:00' }],
    }))

  const remove = (day: number, key: string) =>
    setWeek((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).filter((s) => s.key !== key),
    }))

  const payload = JSON.stringify(
    Object.entries(week).flatMap(([day, spans]) =>
      spans.map((s) => ({ weekday: Number(day), starts: s.starts, ends: s.ends }))
    )
  )

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="spans" value={payload} />

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.success ? <Notice tone="success">{admin.saved}</Notice> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {admin.weekdays.map((label, day) => {
          const spans = week[day] ?? []
          return (
            <section key={day} className="bg-sand-100 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-ink-900 text-[0.8125rem] font-bold">{label}</h2>
                <button
                  type="button"
                  onClick={() => add(day)}
                  className="hover:bg-sand-200 rounded-full px-2.5 py-1 text-[0.75rem] font-medium text-olive-700 transition-colors"
                >
                  + بازه
                </button>
              </div>

              {spans.length === 0 ? (
                <p className="text-ink-400 mt-3 text-[0.75rem]">تعطیل</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {spans.map((span) => {
                    const invalid = span.ends <= span.starts
                    return (
                      // One row at every width: fixed-width fields rather
                      // than flex-1, so they never stretch or wrap.
                      <li key={span.key} className="flex items-center gap-1.5">
                        <TimeField
                          value={span.starts}
                          onChange={(starts) => update(day, span.key, { starts })}
                          label={`شروع بازه ${label}`}
                        />
                        <span className="text-ink-400 shrink-0 text-[0.6875rem]">تا</span>
                        <TimeField
                          value={span.ends}
                          onChange={(ends) => update(day, span.key, { ends })}
                          label={`پایان بازه ${label}`}
                          invalid={invalid}
                        />
                        <button
                          type="button"
                          onClick={() => remove(day, span.key)}
                          aria-label="حذف بازه"
                          className="text-ink-400 ms-auto grid size-7 shrink-0 place-items-center rounded-full transition-colors hover:bg-red-50 hover:text-red-700"
                        >
                          <CloseIcon className="size-3.5" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
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
