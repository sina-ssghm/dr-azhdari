import { CheckIcon, Icon } from '@/components/icons'
import { bookingPage } from '@/content/booking-page'
import { cn } from '@/lib/utils'

/** A finished step is a button back to itself; anything else is inert. */
function Cell({
  reachable,
  label,
  onJump,
  className,
  children,
}: {
  reachable: boolean
  label: string
  onJump: () => void
  className: string
  children: React.ReactNode
}) {
  if (!reachable) return <div className={className}>{children}</div>
  return (
    <button
      type="button"
      onClick={onJump}
      aria-label={`بازگشت به «${label}»`}
      className={cn(className, 'cursor-pointer')}
    >
      {children}
    </button>
  )
}

/**
 * Progress indicator for the wizard, and a way back.
 *
 * `current` is passed in rather than derived from `completed`: once every gate
 * passes — which is exactly when the visitor reaches the review — a derived
 * index would find nothing and leave no step marked.
 *
 * Completed steps are buttons, so a visitor can jump back to fix something.
 * Only backwards: skipping ahead over an unmet gate is what `onJump` refuses.
 */
export function BookingSteps({
  completed,
  current,
  onJump,
}: {
  completed: boolean[]
  current: number
  onJump?: (step: number) => void
}) {
  return (
    <ol className="-mx-5 flex scrollbar-none items-start gap-1 overflow-x-auto px-5 sm:mx-0 sm:justify-center sm:px-0 lg:gap-2">
      {bookingPage.steps.map((step, i) => {
        const done = completed[i] ?? false
        const active = i === current
        const isLast = i === bookingPage.steps.length - 1

        const reachable = i < current && onJump !== undefined

        return (
          <li key={step.id} className="flex shrink-0 items-center gap-1 lg:gap-2">
            <Cell
              reachable={reachable}
              label={step.label}
              onJump={() => onJump?.(i)}
              className="flex w-[6.5rem] flex-col items-center gap-2 sm:w-auto sm:flex-row sm:gap-2.5"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-300 lg:size-10',
                  done
                    ? 'bg-olive-700 text-white'
                    : active
                      ? 'bg-olive-700 text-white'
                      : 'bg-sand-200 text-ink-400'
                )}
              >
                {done ? (
                  <CheckIcon className="size-[0.95rem]" />
                ) : (
                  <Icon name={step.icon} className="size-[1.05rem]" strokeWidth={1.5} />
                )}
              </span>

              <span
                className={cn(
                  'text-center text-[0.75rem] leading-tight text-balance transition-colors duration-300 sm:text-start lg:text-[0.8125rem]',
                  done || active ? 'text-ink-900 font-semibold' : 'text-ink-400'
                )}
              >
                {step.label}
              </span>
            </Cell>

            {!isLast ? (
              <span
                aria-hidden="true"
                className={cn(
                  'hidden h-px w-8 rounded-full transition-colors duration-300 sm:block lg:w-14',
                  done ? 'bg-olive-400' : 'bg-line-strong'
                )}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
