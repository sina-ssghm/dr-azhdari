import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The beige card each step of the reservation flow sits in. */
export function Panel({
  title,
  description,
  className,
  children,
}: {
  title: string
  /** Omitted once a step has narrowed to a follow-up question. */
  description?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'bg-sand-100 flex flex-col rounded-[var(--radius-card)] p-6 lg:p-8',
        className
      )}
    >
      <h2 className="text-ink-900 text-center text-[1.0625rem] font-bold lg:text-[1.125rem]">
        {title}
      </h2>
      {description ? (
        <p className="text-ink-400 mt-2.5 text-center text-[0.8125rem] leading-[1.9]">
          {description}
        </p>
      ) : null}

      <div className="mt-6">{children}</div>
    </section>
  )
}
