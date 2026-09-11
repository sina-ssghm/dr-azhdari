import type { Country } from '@/lib/phone'
import { cn } from '@/lib/utils'

/**
 * A country's flag, as a file rather than the emoji.
 *
 * Emoji flags are regional-indicator pairs and Windows ships no glyphs for
 * them, so they render as bare letters — "IR", "DE" — on every desktop.
 *
 * Lazy by default: the country picker holds 265 of these, and without it
 * opening the list would fetch every one. Plain <img>, not next/image — they
 * are tiny static SVGs with nothing for the optimiser to do.
 */
export function Flag({
  country,
  className,
  loading = 'lazy',
  decorative = false,
}: {
  country: Country | undefined
  className?: string
  loading?: 'lazy' | 'eager'
  /**
   * Set where the country's name is already written beside the flag.
   *
   * Without it a screen reader says the name twice — "کانادا کانادا" — and the
   * accessible name of any button wrapping the pair reads the same way.
   */
  decorative?: boolean
}) {
  if (!country) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={country.flag}
      alt={decorative ? '' : country.name}
      width={20}
      height={14}
      loading={loading}
      decoding="async"
      className={cn(
        'border-line h-[0.875rem] w-5 shrink-0 rounded-[2px] border object-cover',
        className
      )}
    />
  )
}
