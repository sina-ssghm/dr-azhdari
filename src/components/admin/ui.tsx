import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* Shared styling for admin forms — same palette and rhythm as the public site. */

export const inputClass =
  'border-line w-full rounded-xl border bg-white px-4 py-2.5 text-[0.8125rem] text-ink-900 ' +
  'placeholder:text-ink-400/70 transition-colors duration-200 ' +
  'hover:border-line-strong focus:border-olive-400 focus:outline-none disabled:opacity-60'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-ink-900 text-[1.35rem] font-bold lg:text-[1.5rem]">
          {title}
        </h1>
        {description ? (
          <p className="text-ink-400 mt-2 text-[0.8125rem] leading-[1.9]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function Card({
  title,
  description,
  /** Sits opposite the title — the left-hand corner in RTL. */
  action,
  className,
  children,
}: {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn('bg-sand-100 rounded-[var(--radius-card)] p-6 lg:p-7', className)}
    >
      {title || action ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <h2 className="text-ink-900 text-[0.9375rem] font-bold">{title}</h2>
          ) : null}
          {action}
        </div>
      ) : null}
      {description ? (
        <p className="text-ink-400 mt-2 text-[0.8125rem] leading-[1.9]">{description}</p>
      ) : null}
      <div className={title || description || action ? 'mt-5' : undefined}>
        {children}
      </div>
    </section>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-ink-500 mb-2 block text-[0.75rem]">
        {label}
      </label>
      {children}
      {hint ? <p className="text-ink-400 mt-1.5 text-[0.6875rem]">{hint}</p> : null}
    </div>
  )
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'success'
  children: ReactNode
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl px-4 py-3 text-[0.8125rem] leading-[1.9]',
        tone === 'error' && 'bg-red-50 text-red-800',
        tone === 'success' && 'bg-olive-50 text-olive-800',
        tone === 'info' && 'bg-sand-200 text-ink-500'
      )}
    >
      {children}
    </p>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="border-line text-ink-400 rounded-xl border border-dashed px-4 py-10 text-center text-[0.8125rem]">
      {children}
    </p>
  )
}

const badgeTones = {
  neutral: 'bg-sand-200 text-ink-500',
  green: 'bg-olive-100 text-olive-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
} as const

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof badgeTones
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-medium',
        badgeTones[tone]
      )}
    >
      {children}
    </span>
  )
}
