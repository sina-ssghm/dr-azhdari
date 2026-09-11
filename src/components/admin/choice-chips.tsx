'use client'

import { cn } from '@/lib/utils'

export type Choice = { value: string; label: string }

/**
 * Radio group styled as chips — the same treatment used for picking a service,
 * applied to the other single-choice fields so the admin forms stay consistent.
 */
export function ChoiceChips({
  name,
  legend,
  options,
  value,
  onChange,
  hint,
  disabled = false,
}: {
  name: string
  legend: string
  options: readonly Choice[]
  value: string
  onChange: (value: string) => void
  hint?: string
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled} className={cn(disabled && 'opacity-55')}>
      <legend className="text-ink-500 mb-2 text-[0.75rem]">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'border-line has-checked:bg-sand-200 has-checked:border-olive-600',
              'flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-[0.75rem] transition-colors',
              disabled ? 'cursor-default' : 'cursor-pointer'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="size-4 accent-olive-700"
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint ? <p className="text-ink-400 mt-1.5 text-[0.6875rem]">{hint}</p> : null}
    </fieldset>
  )
}
