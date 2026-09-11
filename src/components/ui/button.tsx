import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const base =
  'group/btn inline-flex items-center justify-center gap-2.5 rounded-full font-medium ' +
  'whitespace-nowrap transition-all duration-300 ease-[var(--ease-out-soft)] ' +
  'disabled:pointer-events-none disabled:opacity-55'

const variants: Record<Variant, string> = {
  primary:
    'bg-olive-700 text-white shadow-[var(--shadow-btn)] hover:bg-olive-800 ' +
    'hover:shadow-[0_10px_26px_-8px_rgb(79_95_62/0.7)] hover:-translate-y-0.5 active:translate-y-0',
  outline:
    'border border-line-strong bg-white/70 text-ink-900 backdrop-blur-sm ' +
    'hover:border-olive-400 hover:bg-white hover:text-olive-800 hover:-translate-y-0.5 active:translate-y-0',
  ghost: 'text-ink-700 hover:bg-sand-200 hover:text-ink-900',
}

const sizes: Record<Size, string> = {
  sm: 'h-11 px-6 text-[0.8125rem]',
  md: 'h-[3.125rem] px-7 text-sm',
  lg: 'h-[3.5rem] px-8 text-[0.9375rem]',
}

const iconSizes: Record<Size, string> = {
  sm: 'size-[1.05rem]',
  md: 'size-[1.15rem]',
  lg: 'size-[1.25rem]',
}

type SharedProps = {
  variant?: Variant
  size?: Size
  /** Rendered at the inline start (the right-hand side in RTL), as in the design. */
  icon?: ReactNode
  className?: string
  children: ReactNode
}

type LinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, keyof SharedProps>
type NativeButtonProps = Omit<ComponentPropsWithoutRef<'button'>, keyof SharedProps>

export type ButtonProps = SharedProps &
  (({ href: string } & LinkProps) | ({ href?: undefined } & NativeButtonProps))

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className)

  const content = (
    <>
      {icon ? (
        <span
          className={cn(
            iconSizes[size],
            'shrink-0 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover/btn:scale-110'
          )}
        >
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </>
  )

  if (typeof rest.href === 'string') {
    return (
      <Link className={classes} {...(rest as LinkProps & { href: string })}>
        {content}
      </Link>
    )
  }

  return (
    <button className={classes} {...(rest as NativeButtonProps)}>
      {content}
    </button>
  )
}
