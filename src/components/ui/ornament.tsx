import { cn } from '@/lib/utils'

/** The small flourish that sits under each section title in the design. */
export function Ornament({ className }: { className?: string }) {
  return (
    <svg
      width="96"
      height="12"
      viewBox="0 0 96 12"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('text-olive-400', className)}
    >
      <path
        d="M2 6h26M68 6h26"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="33" cy="6" r="1.4" fill="currentColor" opacity="0.7" />
      <circle cx="63" cy="6" r="1.4" fill="currentColor" opacity="0.7" />
      <path
        d="M48 1.4 52.6 6 48 10.6 43.4 6 48 1.4Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M48 4.1 49.9 6 48 7.9 46.1 6 48 4.1Z" fill="currentColor" opacity="0.55" />
    </svg>
  )
}
