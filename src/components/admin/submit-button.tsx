'use client'

import { useFormStatus } from 'react-dom'
import { cn } from '@/lib/utils'

export function SubmitButton({
  children,
  pendingLabel = 'در حال ذخیره…',
  variant = 'primary',
  className,
  disabled,
  ...rest
}: {
  children: React.ReactNode
  pendingLabel?: string
  variant?: 'primary' | 'ghost' | 'danger'
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'className' | 'children'> & {
    className?: string
  }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      // Destructured out of `rest` on purpose: spreading it last would let a
      // `disabled={false}` from the caller re-enable the button mid-submit.
      disabled={pending || disabled}
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-full px-6 text-[0.8125rem] font-medium',
        'transition-all duration-300 ease-[var(--ease-out-soft)] disabled:pointer-events-none disabled:opacity-55',
        variant === 'primary' &&
          'bg-olive-700 text-white shadow-[var(--shadow-btn)] hover:bg-olive-800',
        variant === 'ghost' &&
          'border-line-strong text-ink-700 border bg-white hover:border-olive-400 hover:text-olive-800',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className
      )}
      {...rest}
    >
      {pending ? pendingLabel : children}
    </button>
  )
}
