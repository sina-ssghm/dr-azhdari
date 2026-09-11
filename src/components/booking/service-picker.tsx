'use client'

import { CheckIcon, Icon } from '@/components/icons'
import { Panel } from '@/components/booking/panel'
import { bookingPage, type ServiceId } from '@/content/booking-page'
import { cn, toPersianDigits } from '@/lib/utils'

export function ServicePicker({
  value,
  duration,
  onChange,
  onDurationChange,
}: {
  value: ServiceId | null
  duration: number | null
  onChange: (id: ServiceId) => void
  onDurationChange: (minutes: number) => void
}) {
  const { title, description, options } = bookingPage.service
  const selected = options.find((o) => o.id === value)

  return (
    <Panel title={title} description={description}>
      <div role="radiogroup" aria-label={title} className="flex flex-col gap-2.5">
        {options.map((option) => {
          const isSelected = option.id === value

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.id)}
              className={cn(
                'flex w-full items-center gap-3.5 rounded-2xl border p-4 text-start',
                'transition-all duration-300 ease-[var(--ease-out-soft)]',
                isSelected
                  ? 'bg-sand-200 border-olive-400'
                  : 'border-line hover:border-line-strong bg-white/70 hover:bg-white'
              )}
            >
              <Icon
                name={option.icon}
                strokeWidth={1.4}
                className={cn(
                  'size-[1.35rem] shrink-0 transition-colors duration-300',
                  isSelected ? 'text-olive-700' : 'text-ink-400'
                )}
              />

              <span className="min-w-0 flex-1">
                <span className="text-ink-900 block text-[0.8125rem] font-semibold">
                  {option.title}
                </span>
                <span className="text-ink-400 mt-1 block text-[0.75rem] leading-[1.85]">
                  {option.description}
                </span>
              </span>

              <span
                aria-hidden="true"
                className={cn(
                  'grid size-[1.375rem] shrink-0 place-items-center rounded-full border transition-all duration-300',
                  isSelected
                    ? 'border-olive-700 bg-olive-700 text-white'
                    : 'border-line-strong text-transparent'
                )}
              >
                <CheckIcon className="size-3" />
              </span>
            </button>
          )
        })}
      </div>

      {/* Referral warning — amber rather than the site's olive, so it reads as
          a caution and not as another piece of descriptive copy. */}
      {selected?.notice ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-[0.8125rem] leading-[1.95] text-amber-900"
        >
          {selected.notice}
        </p>
      ) : null}

      {/* Only shown where there is a real choice to make. */}
      {selected && selected.durations.length > 1 ? (
        <fieldset className="mt-4">
          <legend className="text-ink-500 mb-2 text-[0.8125rem]">
            {bookingPage.duration.legend}
          </legend>
          <div className="flex flex-wrap gap-2">
            {selected.durations.map((minutes) => (
              <label
                key={minutes}
                className={cn(
                  'border-line has-checked:bg-sand-200 has-checked:border-olive-600',
                  'flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-[0.8125rem] transition-colors'
                )}
              >
                <input
                  type="radio"
                  name="duration"
                  value={minutes}
                  checked={duration === minutes}
                  onChange={() => onDurationChange(minutes)}
                  className="size-4 accent-olive-700"
                />
                {toPersianDigits(bookingPage.duration.label(minutes))}
              </label>
            ))}
          </div>
          <p className="text-ink-400 mt-2 text-[0.75rem]">{bookingPage.duration.hint}</p>
        </fieldset>
      ) : null}
    </Panel>
  )
}
