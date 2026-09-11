import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The single horizontal rhythm for the whole page. */
export function Container({
  as: Tag = 'div',
  className,
  children,
}: {
  as?: ElementType
  className?: string
  children: ReactNode
}) {
  return (
    <Tag className={cn('mx-auto w-full max-w-[1280px] px-5 sm:px-7 lg:px-10', className)}>
      {children}
    </Tag>
  )
}
