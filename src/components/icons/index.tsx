import type { SVGProps } from 'react'

/* ------------------------------------------------------------------ *
 * Hand-drawn line icons matching the design's stroke weight.
 *
 * These are deliberately not from an icon library: the design uses a
 * consistent 1.5px rounded stroke on a 24px grid that no off-the-shelf
 * set matches exactly, and inlining them costs no runtime JS.
 * ------------------------------------------------------------------ */

type IconProps = SVGProps<SVGSVGElement>

/** Shared stroke geometry — every outline icon renders through this. */
function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="m9 15.4 1.9 1.9 3.6-3.6" />
    </Svg>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.3 8.7 15.4 12l-5.1 3.3V8.7Z" />
    </Svg>
  )
}

export function AwardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="9" r="5.6" />
      <path d="m12 6.4 1 1.9 2.1.3-1.5 1.5.4 2.1-2-1.1-2 1.1.4-2.1L8.9 8.6l2.1-.3Z" />
      <path d="M8.4 13.6 6.8 21 12 18.4 17.2 21l-1.6-7.4" />
    </Svg>
  )
}

export function HeadsetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 13.5v-1.3a8 8 0 0 1 16 0v1.3" />
      <rect x="2.4" y="12.6" width="4.6" height="6.2" rx="2.3" />
      <rect x="17" y="12.6" width="4.6" height="6.2" rx="2.3" />
      <path d="M19.9 18.8v.4a3 3 0 0 1-3 3h-2.6" />
    </Svg>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.8 4.9 5.5v5.8c0 4.5 2.9 8.3 7.1 9.8 4.2-1.5 7.1-5.3 7.1-9.8V5.5L12 2.8Z" />
      <path d="m9.2 11.7 1.9 1.9 3.7-3.7" />
    </Svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.7" />
      <path d="M5.2 20a6.8 6.8 0 0 1 13.6 0" />
    </Svg>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9.2" cy="8" r="3.3" />
      <path d="M3.2 19.2a6 6 0 0 1 12 0" />
      <path d="M16.4 5.2a3.3 3.3 0 0 1 0 5.6" />
      <path d="M17.9 13.5a6 6 0 0 1 2.9 5.7" />
    </Svg>
  )
}

export function HypnotherapyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11.6a8 8 0 1 1 8 8h-3.4a1.6 1.6 0 0 1-1.6-1.6v-1.4A5.3 5.3 0 0 1 4 11.9Z" />
      <circle cx="12.4" cy="11" r="1" />
      <path d="M12.4 8.4a2.6 2.6 0 1 1-2.4 3.6" />
      <path d="M12.4 5.8a5.2 5.2 0 1 1-4.9 6.9" />
    </Svg>
  )
}

export function BrainIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5.4a2.7 2.7 0 0 0-5-1.3 2.6 2.6 0 0 0-2.6 3.9A2.8 2.8 0 0 0 3.5 11a2.8 2.8 0 0 0 1.4 2.4 2.6 2.6 0 0 0 1.7 3.5 2.6 2.6 0 0 0 3.2 2.5A2.4 2.4 0 0 0 12 20.8Z" />
      <path d="M12 5.4a2.7 2.7 0 0 1 5-1.3 2.6 2.6 0 0 1 2.6 3.9A2.8 2.8 0 0 1 20.5 11a2.8 2.8 0 0 1-1.4 2.4 2.6 2.6 0 0 1-1.7 3.5 2.6 2.6 0 0 1-3.2 2.5A2.4 2.4 0 0 1 12 20.8Z" />
      <path d="M12 5.4v15.4" />
    </Svg>
  )
}

export function MonitorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="4" width="19" height="13" rx="2.5" />
      <path d="M8.5 21h7M12 17v4" />
    </Svg>
  )
}

export function LeafIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.4 19.6C2.8 14 6 6.4 19.6 4.4c1.5 7.6-3.6 15.6-11.2 14.6" />
      <path d="M4.4 19.6c3.6-4.6 7.7-8.2 12.3-10.3" />
    </Svg>
  )
}

export function HeartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20.4S4.3 15.7 4.3 10.5a4.4 4.4 0 0 1 7.7-2.9 4.4 4.4 0 0 1 7.7 2.9c0 5.2-7.7 9.9-7.7 9.9Z" />
    </Svg>
  )
}

export function LotusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20.6c3 0 5.6-1.6 7-4-1.4-2.4-4-4-7-4s-5.6 1.6-7 4c1.4 2.4 4 4 7 4Z" />
      <path d="M12 12.6c1.7-1.4 2.7-3.4 2.7-5.6 0-1.4-.9-2.8-2.7-4-1.8 1.2-2.7 2.6-2.7 4 0 2.2 1 4.2 2.7 5.6Z" />
      <path d="M5.3 16.4c-.7-2 0-4.2 1.7-5.6M18.7 16.4c.7-2 0-4.2-1.7-5.6" />
    </Svg>
  )
}

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.6 3.4h3l1.5 3.8-1.9 1.2a12.2 12.2 0 0 0 5.4 5.4l1.2-1.9 3.8 1.5v3a1.9 1.9 0 0 1-2 1.9A16.3 16.3 0 0 1 4.7 5.4a1.9 1.9 0 0 1 1.9-2Z" />
    </Svg>
  )
}

/** The email row in the footer's contact column. */
export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="m3.6 7.6 7.2 5a2 2 0 0 0 2.4 0l7.2-5" />
    </Svg>
  )
}

/** The clinic's address, in the same column. */
export function MapPinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21.2c3.6-4 5.4-7.1 5.4-9.4a5.4 5.4 0 1 0-10.8 0c0 2.3 1.8 5.4 5.4 9.4Z" />
      <circle cx="12" cy="11.4" r="2.1" />
    </Svg>
  )
}

/** Points toward the reading direction's end — i.e. leftwards in RTL. */
/** Points at the list further down the page, not at another page. */
export function ArrowDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.4v15.2" />
      <path d="m5.6 13.2 6.4 6.4 6.4-6.4" />
    </Svg>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19.5 12H5" />
      <path d="m11 5.5-6.5 6.5 6.5 6.5" />
    </Svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
      <path d="M13.7 20a1.9 1.9 0 0 1-3.4 0" />
    </Svg>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 16V4m0 0L8 8m4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Svg>
  )
}

/** Overflow menu affordance — dots are filled, not stroked. */
export function MoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function InstagramIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.05" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function WhatsappIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M12.04 2.5c-5.2 0-9.42 4.22-9.42 9.41 0 1.66.44 3.29 1.26 4.72L2.5 21.5l4.99-1.31a9.4 9.4 0 0 0 4.55 1.16h.01c5.19 0 9.41-4.22 9.41-9.42a9.36 9.36 0 0 0-2.75-6.66 9.34 9.34 0 0 0-6.67-2.77Zm0 1.59a7.8 7.8 0 0 1 5.54 2.3 7.79 7.79 0 0 1 2.29 5.53c0 4.32-3.51 7.83-7.84 7.83a7.82 7.82 0 0 1-3.98-1.09l-.29-.17-2.96.78.79-2.89-.19-.3a7.79 7.79 0 0 1-1.2-4.16c0-4.32 3.52-7.83 7.84-7.83ZM9.57 7.99c-.16 0-.4.06-.61.29-.21.23-.8.78-.8 1.9s.82 2.2.93 2.36c.12.15 1.62 2.47 3.92 3.46.55.24.97.38 1.3.49.55.17 1.05.15 1.45.09.44-.07 1.37-.56 1.56-1.1.19-.55.19-1.01.14-1.11-.06-.1-.21-.15-.44-.27-.23-.11-1.37-.67-1.58-.75-.21-.08-.36-.11-.51.12-.15.23-.59.75-.72.9-.14.16-.27.18-.5.06-.23-.11-.98-.36-1.86-1.15-.69-.61-1.15-1.37-1.29-1.6-.13-.23-.01-.36.1-.47.11-.1.23-.27.34-.4.12-.14.15-.23.23-.38.08-.16.04-.29-.02-.4-.06-.12-.51-1.25-.7-1.71-.19-.44-.37-.38-.51-.39h-.43Z" />
    </svg>
  )
}

/** Concentric rings — the hypnosis focal point. */
export function SpiralIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.2" />
      <circle cx="12" cy="12" r="5.6" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** Head in profile with a sprout inside — growth through self-exploration. */
export function MindGrowthIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Skull, then the jaw stepping down to the neck. */}
      <path d="M19.9 12.9A7.9 7.9 0 1 0 8.6 20v1.1a1.5 1.5 0 0 0 1.5 1.5h4.6" />
      {/* Stem and two leaves. */}
      <path d="M13.4 18v-4.3" />
      <path d="M13.4 13.9c-2.1 0-3.2-1.1-3.3-3.2 2.1-.1 3.2 1 3.3 3.2Z" />
      <path d="M13.4 14.7c2.1-.1 3.2-1.2 3.3-3.4-2.1.2-3.2 1.3-3.3 3.4Z" />
    </Svg>
  )
}

export function GlobeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.2 9.6h17.6M3.2 14.4h17.6" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
    </Svg>
  )
}

export function CreditCardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19" />
      <path d="M6 14.5h3.5" />
    </Svg>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" />
      <circle cx="12" cy="15.4" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** Opening quotation marks, set above a testimonial. */
export function QuoteIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M9.4 5.6c-3.2 1.3-5.2 4-5.2 7.5 0 3.1 1.8 5.3 4.4 5.3 2.2 0 3.8-1.6 3.8-3.7 0-2-1.4-3.5-3.3-3.5-.4 0-.8.1-1 .2.4-1.7 1.8-3.2 3.6-4L9.4 5.6ZM19 5.6c-3.2 1.3-5.2 4-5.2 7.5 0 3.1 1.8 5.3 4.4 5.3 2.2 0 3.8-1.6 3.8-3.7 0-2-1.4-3.5-3.3-3.5-.4 0-.8.1-1 .2.4-1.7 1.8-3.2 3.6-4L19 5.6Z" />
    </svg>
  )
}

/** A PDF paper, on the articles list. */
export function DocumentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V8l-4.5-4.5Z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M9 13h6M9 16.5h4" />
    </Svg>
  )
}

/** Downloading that paper. */
export function DownloadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v11" />
      <path d="m8 11.5 4 4 4-4" />
      <path d="M5 19.5h14" />
    </Svg>
  )
}

/** A questionnaire — the online tests. */
export function ClipboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4.5h6a1 1 0 0 1 1 1v1H8v-1a1 1 0 0 1 1-1Z" />
      <path d="M8 6.5H6.5a1.5 1.5 0 0 0-1.5 1.5v10.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V8a1.5 1.5 0 0 0-1.5-1.5H16" />
      <path d="M8.75 11.5h6.5M8.75 15h4" />
    </Svg>
  )
}

/** How long a test takes. */
export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Svg>
  )
}

/** Sliders — opens the search and date filters on small screens. */
export function FilterIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="2" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** Add `animate-spin` at the call site. */
export function SpinnerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </Svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.6 4.5L19 7.5" strokeWidth={2} />
    </Svg>
  )
}

/** Chevrons point at the physical side named — the calendar uses both. */
export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9 5 7 7-7 7" />
    </Svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m15 5-7 7 7 7" />
    </Svg>
  )
}

/**
 * A fingerpost: one post, two boards pointing opposite ways.
 *
 * The one shape «تصمیم‌گیری‌های مهم زندگی» needed and the set did not have —
 * every other mark here is a person, a mind, a feeling or an object from the
 * booking and tests flows, and a choice is none of those. Two directions
 * rather than one, because the card is about a fork and not about being sent
 * somewhere. Three strokes and no ground line: at the 20px this renders at on
 * a phone, a fourth would close up into a smudge.
 */
export function SignpostIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.8v18.4" />
      <path d="M12 5.6h6.2l2.2 2.4-2.2 2.4H12" />
      <path d="M12 13.2H5.8L3.6 15.6l2.2 2.4H12" />
    </Svg>
  )
}

/**
 * A rain cloud, for low mood. Three drops rather than a downpour: the copy it
 * labels is «افسردگی خفیف تا متوسط», and a heavier storm would overstate it.
 */
export function CloudRainIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.4 16.2a3.9 3.9 0 0 1-.4-7.8 5 5 0 0 1 9.5-1 3.6 3.6 0 0 1 .4 7.2" />
      <path d="M9.2 18.6 8.4 20.6M12.4 18.4l-.9 2.4M15.5 18.6l-.8 2" />
    </Svg>
  )
}

/**
 * A crescent for sleep. The moon is cut by a second arc rather than drawn as
 * one closed path, so the stroke stays an even weight the whole way round.
 */
export function MoonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 14.4A8.4 8.4 0 0 1 9.1 3.8a8.6 8.6 0 1 0 10.9 10.6Z" />
    </Svg>
  )
}

/**
 * A broken link, for habits and dependencies. The two halves are pulled apart
 * along the same diagonal a whole link would sit on, which is what reads as
 * "broken" rather than merely "two shapes".
 */
export function LinkBreakIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.7 14.3 8 16a3.6 3.6 0 1 1-5.1-5.1l1.7-1.7" />
      <path d="M14.3 9.7 16 8a3.6 3.6 0 1 0-5.1-5.1L9.2 4.6" />
      <path d="M4.4 4.4 6 6M20 20l-1.6-1.6M14.6 19.6V22M19.6 14.6H22M9.4 4.4V2M4.4 9.4H2" />
    </Svg>
  )
}

/**
 * Two arrows chasing each other, for a pattern that repeats. Open at both
 * ends rather than a closed ring: a complete circle reads as "refresh", and
 * what this labels is a loop someone is trying to get out of.
 */
export function CycleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.2 12a8.2 8.2 0 0 1-13.6 6.1" />
      <path d="M3.8 12a8.2 8.2 0 0 1 13.6-6.1" />
      <path d="M17.6 2.2v3.9h-3.9M6.4 21.8v-3.9h3.9" />
    </Svg>
  )
}

/**
 * Three interlocking loops, for identity. A knot rather than a single ring:
 * what the copy beside it describes is the work of holding several selves
 * together, which one closed circle does not say.
 */
export function KnotIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.4" r="4.3" />
      <circle cx="8.2" cy="14.9" r="4.3" />
      <circle cx="15.8" cy="14.9" r="4.3" />
    </Svg>
  )
}

/**
 * A head in profile, for self-knowledge. Deliberately empty where
 * `MindGrowthIcon` puts a seedling — that one is about growth, this one is
 * about looking inward, and an icon set earns its keep by keeping them apart.
 */
export function HeadProfileIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.6 21.5v-3.8a7.3 7.3 0 1 1 8.7-8.4c.3 1.6 1 2.7 1.8 3.7.4.5.1 1.3-.5 1.4l-1.5.3v2.3a1.8 1.8 0 0 1-1.8 1.8h-1.8v2.7" />
    </Svg>
  )
}

/**
 * A house with a heart in it, for a relationship being built rather than
 * merely felt — the copy beside it is about making something that lasts.
 */
export function HomeHeartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.2 12 3.6l8 6.6v9a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19.2Z" />
      <path d="M12 17.6s-3-1.8-3-3.8a1.7 1.7 0 0 1 3-1.1 1.7 1.7 0 0 1 3 1.1c0 2-3 3.8-3 3.8Z" />
    </Svg>
  )
}

/**
 * Two rings, overlapping. For readiness for marriage — the shape is the
 * conventional one and reads instantly, which an abstract pair of circles
 * would not.
 */
export function RingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8.8" cy="14.4" r="5.4" />
      <circle cx="15.2" cy="14.4" r="5.4" />
      <path d="M12 6.6 10.2 4.4h3.6Z" />
    </Svg>
  )
}

/**
 * Two speech bubbles, for communication. Overlapping rather than side by
 * side: what the copy describes is being understood, which needs both to be
 * in the same conversation.
 */
export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15.4 12.6a2 2 0 0 1-2 2H8.2l-3.4 2.6v-2.6H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h9.4a2 2 0 0 1 2 2Z" />
      <path d="M18.2 7.8H20a2 2 0 0 1 2 2v5.4a2 2 0 0 1-2 2h-.6v2.4l-3.2-2.4h-3" />
    </Svg>
  )
}

/**
 * A circled "i", beside the note on a service page.
 *
 * r=9 is the circle `PlayIcon`, `GlobeIcon` and `SpinnerIcon` already use, and
 * the dot is filled rather than stroked for the reason `MoreIcon` and
 * `LockIcon` fill theirs: at 24px a 1.5px ring that small reads as a smudge.
 * Drawn rather than composed from a <span> around a literal "i" — a Latin
 * letter in the middle of Persian copy is a stray LTR run needing its own
 * direction, and it would be announced as a letter if the aria-hiding ever
 * slipped. As a path it is a shape, not a character.
 *
 * Out of the registry on purpose: the registry exists so a content file can
 * name a service's icon, and this glyph is the note's own furniture rather
 * than a choice the copy makes. It is imported by name instead.
 */
export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11.2v5" />
      <circle cx="12" cy="7.9" r="1.05" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/**
 * Flag of Iran, drawn rather than using the 🇮🇷 emoji — Windows has no
 * flag glyphs and renders the emoji as the letters "IR".
 */
export function IranFlagIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 16" aria-hidden="true" focusable="false" {...props}>
      <rect width="24" height="16" rx="2.5" fill="#fff" />
      <path
        d="M2.5 0h19A2.5 2.5 0 0 1 24 2.5V5.33H0V2.5A2.5 2.5 0 0 1 2.5 0Z"
        fill="#239f40"
      />
      <path
        d="M0 10.67h24V13.5a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 0 13.5v-2.83Z"
        fill="#da0000"
      />
      <path
        d="M12 6.5c.5.35.78.78.78 1.24 0 .5-.35.9-.78 1.16-.43-.26-.78-.66-.78-1.16 0-.46.28-.89.78-1.24Z"
        fill="#da0000"
      />
    </svg>
  )
}

/** Tether (USDT) mark. */
export function TetherIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <circle cx="12" cy="12" r="11" fill="#26a17b" />
      <path
        fill="#fff"
        d="M13.13 11.31v-1.4h3.2V7.78H7.68v2.13h3.2v1.4c-2.6.12-4.56.64-4.56 1.25 0 .62 1.95 1.13 4.56 1.25v4.02h2.25v-4.02c2.6-.12 4.55-.63 4.55-1.25 0-.61-1.95-1.13-4.55-1.25Zm0 2.13c-.6.01-.4.02-1.13.02-.58 0-.98-.02-1.12-.02v-.01c-2.2-.1-3.85-.48-3.85-.94s1.65-.85 3.85-.94v1.5c.14.01.55.03 1.13.03.7 0 1.06-.02 1.12-.03v-1.5c2.2.1 3.84.48 3.84.94s-1.64.84-3.84.94Z"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * Registry — lets `content/site.ts` reference icons by name so copy and
 * data stay plain serialisable objects.
 * ------------------------------------------------------------------ */

export const icons = {
  award: AwardIcon,
  headset: HeadsetIcon,
  shield: ShieldIcon,
  user: UserIcon,
  users: UsersIcon,
  hypnotherapy: HypnotherapyIcon,
  brain: BrainIcon,
  monitor: MonitorIcon,
  leaf: LeafIcon,
  heart: HeartIcon,
  lotus: LotusIcon,
  phone: PhoneIcon,
  calendar: CalendarIcon,
  play: PlayIcon,
  globe: GlobeIcon,
  card: CreditCardIcon,
  spiral: SpiralIcon,
  mindGrowth: MindGrowthIcon,
  signpost: SignpostIcon,
  cloudRain: CloudRainIcon,
  moon: MoonIcon,
  linkBreak: LinkBreakIcon,
  cycle: CycleIcon,
  knot: KnotIcon,
  headProfile: HeadProfileIcon,
  homeHeart: HomeHeartIcon,
  rings: RingsIcon,
  chat: ChatIcon,
  clipboard: ClipboardIcon,
  document: DocumentIcon,
  clock: ClockIcon,
} as const

export type IconName = keyof typeof icons

export function Icon({ name, ...props }: IconProps & { name: IconName }) {
  const Component = icons[name]
  return <Component {...props} />
}
