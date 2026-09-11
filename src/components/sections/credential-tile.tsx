'use client'

import Image from 'next/image'
import { useCredentialViewer } from './credential-viewer'
import { about, type Credential } from '@/content/about'
import { cn } from '@/lib/utils'

type Variant = 'licence' | 'featured' | 'gallery'

/*
  Written out in full rather than interpolated, per the house rule: Tailwind
  scans source text, and a class it never sees as a literal is a class it never
  emits.

  The `sizes` strings are px and calc rather than a bare `vw` figure, because
  an absolute value lets next/image draw on `imageSizes` (…256, 384) as well as
  `deviceSizes`, whose smallest entry is 640 — five times the pixels a 126px
  thumbnail on a phone can show.

  Each clause is the picture's width *across* its band rather than at one edge
  of it, which is the correction a single number cannot express. Written as the
  width at the breakpoint where a band opens, the tile then outgrows its image
  all the way to the top of that band: the licence declared at 584px is 965px
  wide by the time the band closes at 1023, still holding the 640 candidate and
  stretching it half as wide again — on the one section of this page whose
  subject is text on paper. Below `lg` the tile *is* the container, so
  `calc(100vw - …)` is its width at every step in between; the subtrahend is
  the Container's own `px-5`/`px-7` plus the 2px of border this tile draws
  inside it.

  From `lg` the split and the three-up grid both settle, and a flat top-of-band
  figure is exact enough there because every width in the band resolves to the
  same candidate anyway — 640 for the licence (nothing exists between 384 and
  750) and 384 for a featured card. The strip is the exception and keeps its
  calc: a gallery card runs 214px to 278px across that band, which straddles
  the 256 candidate.

  Nothing asks for more than exists: the scans are 900px wide and the optimizer
  will not enlarge past that, so the widest ask here already gets all of it.
*/
const sizes: Record<Variant, string> = {
  licence:
    '(min-width: 1024px) 610px, (min-width: 640px) calc(100vw - 58px), calc(100vw - 42px)',
  featured:
    '(min-width: 1024px) 384px, (min-width: 640px) calc(100vw - 58px), calc(100vw - 42px)',
  gallery:
    '(min-width: 1280px) 278px, (min-width: 1024px) calc(25vw - 42px), (min-width: 640px) calc(50vw - 42px), calc(50vw - 34px)',
}

/* Certificates compress far worse in AVIF than photographs do — they are line
   art on paper, which is exactly what a lossy codec is worst at. The tiles are
   never read at tile size, only recognised, so they can afford it; the viewer
   is where the quality is spent. */
const quality: Record<Variant, number> = {
  licence: 65,
  featured: 60,
  gallery: 50,
}

const titleSize: Record<Variant, string> = {
  licence: '',
  featured: 'text-[0.9375rem] leading-[1.8]',
  gallery: 'text-[0.75rem] leading-[1.75] sm:text-[0.8125rem]',
}

const issuerSize: Record<Variant, string> = {
  licence: '',
  featured: 'text-[0.8125rem] leading-[1.9]',
  gallery: 'text-[0.6875rem] leading-[1.75]',
}

/**
 * One scan, as a control rather than as content.
 *
 * The whole tile is the button — one target and one name instead of a picture
 * beside a caption that looks as though it should also do something. At 163px
 * on a phone the picture alone would be a small target under a line of text
 * that is not one.
 *
 * `object-contain` on a white mat, never `object-cover`. These fourteen
 * documents run from 900×572 to 900×705, and one crop tight enough to make
 * them a single shape would take the seal off the tall ones and the letterhead
 * off the wide ones — on a page whose whole subject is what the documents say.
 * The frame holds one height so a row of four shares a baseline, and the paper
 * sits inside it whole; the mat is white because the paper is, so the
 * letterboxing has nothing to show and reads as margin rather than as a gap.
 */
export function CredentialTile({
  doc,
  variant,
  decorative = false,
}: {
  doc: Credential
  variant: Variant
  /**
   * For the licence, where a labelled button beside the scan already offers
   * the same action. `tabIndex={-1}` is what makes `aria-hidden` legitimate
   * here: a focusable node hidden from the accessibility tree is the classic
   * way to strand a keyboard user on a control their screen reader never
   * announced, and taking it out of the tab order first leaves exactly one
   * control that both of them can reach.
   */
  decorative?: boolean
}) {
  const { open } = useCredentialViewer()

  return (
    <button
      type="button"
      onClick={(event) => open(doc.id, event.currentTarget)}
      aria-haspopup={decorative ? undefined : 'dialog'}
      aria-label={decorative ? undefined : about.viewLarger(doc.title)}
      aria-hidden={decorative ? 'true' : undefined}
      tabIndex={decorative ? -1 : undefined}
      /* The focus ring is drawn inside the tile. globals.css offsets it by 3px,
         and out there the strip's own `overflow-x` clips it — and widening the
         strip to make room is precisely what would break the card arithmetic
         below. */
      className={cn(
        'group/doc border-line flex h-full w-full flex-col hover:border-olive-400',
        'overflow-hidden rounded-[var(--radius-card)] border bg-white text-start',
        'transition-colors duration-300 focus-visible:-outline-offset-2',
        decorative && 'cursor-zoom-in shadow-[var(--shadow-soft)]'
      )}
    >
      <span className="relative block aspect-[3/2] w-full overflow-hidden bg-white">
        <Image
          src={doc.src}
          /* Empty on purpose. The button already carries a name, which
             overrides anything in here, and the scan's real description belongs
             on the copy inside the viewer — the one somebody opened in order to
             read. Describing it twice would make the strip unusable to anybody
             tabbing through fourteen paragraphs of certificate. */
          alt=""
          fill
          sizes={sizes[variant]}
          quality={quality[variant]}
          className="object-contain p-2 transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover/doc:scale-[1.03]"
        />
      </span>

      {/* The licence section's heading has already named the document, so the
          scan beside it carries no caption of its own. */}
      {variant === 'licence' ? null : (
        <span className="border-line flex flex-1 flex-col gap-1.5 border-t p-3 sm:p-4">
          {/* Clamped at two lines so one long title cannot push a single card
              taller than the three beside it. Nothing is lost — the button's
              accessible name carries the whole string. */}
          <span
            className={cn('text-ink-900 line-clamp-2 font-semibold', titleSize[variant])}
          >
            {doc.title}
          </span>

          <span className={cn('text-ink-500 line-clamp-2', issuerSize[variant])}>
            {doc.issuer}
          </span>
        </span>
      )}
    </button>
  )
}
