import { cn } from '@/lib/utils'
import { Ornament } from './ornament'

export function SectionHeading({
  title,
  description,
  className,
  id,
}: {
  title: string
  description?: string
  className?: string
  id?: string
}) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <h2
        id={id}
        className="font-display text-ink-900 text-[1.75rem] font-bold sm:text-[2rem] lg:text-[2.25rem]"
      >
        {title}
      </h2>

      <Ornament className="mt-3" />

      {description ? (
        <p className="text-ink-500 mt-5 max-w-[34rem] text-[0.9375rem] leading-[2.1]">
          {description}
        </p>
      ) : null}
    </div>
  )
}
