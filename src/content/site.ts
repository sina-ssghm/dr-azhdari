import type { IconName } from '@/components/icons'

/* ------------------------------------------------------------------ *
 * Single source of truth for every user-facing string on the site.
 * Components render this — they never hard-code copy. When the client
 * wants a wording change, it happens here and nowhere else.
 * ------------------------------------------------------------------ */

export const site = {
  name: 'دکتر زهره اژدری',
  role: 'روان‌شناس و هیپنوتراپیست',
  /** Digits stay Latin here so `tel:` / `wa.me` links stay valid. */
  phone: '09392738157',
  phoneIntl: '+989392738157',
  instagram: 'dr.zohre.azhdari',
  instagramUrl: 'https://instagram.com/dr.zohre.azhdari',
  get whatsappUrl() {
    return `https://wa.me/${this.phoneIntl.replace('+', '')}`
  },
  /**
   * Used for canonical URLs, Open Graph tags, robots.txt and sitemap.xml.
   * Set NEXT_PUBLIC_SITE_URL at build time to the real domain — the fallback
   * below is a placeholder and will produce wrong canonical URLs if shipped.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://drazhdari.ir',
} as const

/**
 * The practice's contact details, and the fallback the footer uses whenever
 * the database is unreachable or an admin has left a box empty.
 *
 * Defaults, not the source of truth: the admin settings page writes over each
 * one. They live here rather than only in `app_setting` because `next build`
 * prerenders the 404 and five other pages inside the Docker image, where
 * there is no database to ask, and because a cold install has to render the
 * real details before anyone has opened the settings page.
 *
 * Keyed by setting key so the reader in `server/settings.ts` can map straight
 * across with no translation table in between.
 *
 * «تلفنی» / «منشی (حضوری)» is an assumption drawn from the client's own
 * «تلفنی منشی حضوری»: 0917 is a mobile prefix and 0713 is Shiraz's landline.
 * Both labels are admin-editable, so correcting the guess needs no deploy.
 */
export const contact = {
  /** Digits stay Latin here, as in `site.phone`, so `tel:` links stay dialable. */
  /*
    Both clinic numbers sit under one caption. They were captioned separately
    at first, on the reading that «تلفنی منشی حضوری» named two things; it
    names one — the reception, reachable on a landline or a mobile.
  */
  contact_phone_secondary: '07136282576',
  contact_phone_primary: '09178069588',
  contact_phone_secondary_label: 'منشی (حضوری)',
  /*
    The number every «تماس مستقیم» button and the WhatsApp link already dial
    — `site.phone`. It was the one contact detail the footer did not carry, so
    the site quoted two different numbers within a screen of each other.
  */
  contact_phone_mobile: site.phone,
  contact_phone_mobile_label: 'همراه',
  contact_email: 'Baharparvin57@gmail.com',
  /** The client's own spelling of their clinic's name, not a typo to correct. */
  contact_clinic: 'کلنیک آروان',
  /** Kept verbatim, punctuation and all — it is an address, not prose. */
  contact_address:
    'فارس،شیراز، خیابان ستارخان روبروی خیابان ولیعصر، ساختمان پزشکان سیلور طبقه دوم واحد A201',
} as const

export type NavItem = { label: string; href: string }

/*
  `/contact` is deliberately absent: it is still a holding page, and this list
  is the single source for the header, the mobile menu, the footer's quick
  links and the sitemap — so dropping an entry here hides it in all four at
  once. Put a row back when its page has real content, which is what `/about`
  has just done.

  «آشنایی با من», not «درباره من»: it is the client's own wording and it is the
  page's <h1>, so the link and what it leads to say the same thing. The
  footer's quick-links column reads its label from here too, so the rename
  lands there without a second edit.
*/
export const nav: readonly NavItem[] = [
  { label: 'صفحه اصلی', href: '/' },
  { label: 'آشنایی با من', href: '/about' },
  { label: 'خدمات', href: '/services' },
  { label: 'تست شخصیت', href: '/tests' },
  { label: 'هیپنوتراپی', href: '/hypnotherapy' },
  { label: 'مقالات', href: '/articles' },
]

export const cta = {
  book: 'رزرو جلسه مشاوره',
  bookHref: '/booking',
  about: 'درباره من',
  aboutHref: '/about',
  more: 'اطلاعات بیشتر',
} as const

export const hero = {
  titleLead: 'مسیر آرامش',
  /** Split so `ذهن` can carry the olive accent, exactly as in the design. */
  titleRest: { before: 'از ', accent: 'ذهن', after: ' تا زندگی' },
  description:
    'روان‌درمانی تخصصی، هیپنوتراپی و مشاوره حرفه‌ای برای بهبود کیفیت زندگی و ساختن رابطه‌ای سالم با خود و دیگران',
  image: {
    src: '/images/hero-therapist.jpg',
    alt: 'دکتر زهره اژدری، روان‌شناس و هیپنوتراپیست، پشت میز مطب',
  },
  badges: [
    {
      icon: 'award' satisfies IconName,
      title: 'تجربه و تخصص',
      description: '۱۲ سال تجربه حرفه‌ای',
    },
    {
      icon: 'headset' satisfies IconName,
      title: 'مشاوره حضوری و آنلاین',
      description: 'انعطاف‌پذیر مطابق نیاز شما',
    },
    {
      icon: 'shield' satisfies IconName,
      title: 'محرمانگی کامل',
      description: 'اطلاعات شما کاملاً محفوظ است',
    },
  ],
} as const

export type ServiceItem = {
  slug: string
  icon: IconName
  title: string
  description: string
  /** Optional list, used where the card enumerates modalities instead of prose. */
  bullets?: readonly string[]
  /**
   * Somewhere other than this service's own `/services/[slug]` page.
   *
   * Set it and no detail page is generated for the slug, because the card is
   * a signpost to a section that already exists rather than a stub.
   */
  href?: string
  /** Overrides «اطلاعات بیشتر» where a different verb reads better. */
  cta?: string
}

/**
 * A video's still, routed through the image optimiser rather than named
 * directly.
 *
 * `poster` is a plain URL, so it bypasses next/image and no format
 * negotiation happens: the raw JPEG is ~115 KB and the browser fetches it on
 * load whatever `preload="none"` says, which is a quarter of the homepage's
 * bytes for two frames that are both thousands of pixels below the fold. The
 * same source through the optimiser is ~43 KB of AVIF. 1080 is what the 34rem
 * column asks for on a 2x desktop display; a phone overpays slightly, and
 * that is the price of an attribute that cannot carry a srcset.
 *
 * Both stills are 1000x667, which is what `IntroPlayer` frames at — a still
 * of another shape would letterbox inside the player rather than fill it.
 */
export const videoPoster = (file: string) =>
  `/_next/image?url=${encodeURIComponent(`/images/${file}`)}&w=1080&q=75`

/**
 * The introduction that opens the page, above the services.
 *
 * Written in her own voice — it is a caption to a piece to camera, not a
 * description of the practice.
 */
export const intro = {
  title: 'سلام، من دکتر زهره اژدری هستم',
  body: 'در جلسات درمان تلاش می‌کنم فضایی امن، بدون قضاوت و کاملاً محرمانه ایجاد کنم؛ فضایی که در آن بتوانیم فراتر از نشانه‌ها، الگوها و ریشه‌های مسئله را بشناسیم و متناسب با نیاز شما، مسیر درمان را شکل دهیم.',
  cta: 'بیشتر درباره من',
  video: {
    src: '/videos/main.mp4',
    poster: videoPoster('cover.jpg'),
    label: 'ویدئوی معرفی دکتر زهره اژدری',
    play: 'پخش ویدئوی معرفی',
  },
} as const

/**
 * The hypnotherapy band, directly below the services.
 *
 * The services list names hypnotherapy and never says what it is, so this is
 * the short answer, placed where the question occurs. Unlike `intro`, the
 * destination lives here too — where a link points is content, and it is
 * changed in this file or nowhere.
 *
 * `body` is set to three lines by the band's 34rem column; a longer or
 * shorter rewrite will change that count and loosen the card, so re-check the
 * band at 1440px if this string is edited.
 */
export const hypnotherapy = {
  title: 'هیپنوتراپی چیست؟',
  body: 'هیپنوتراپی روشی علمی و مؤثر برای دسترسی به لایه‌های عمیق ذهن و تغییر الگوهای فکری و هیجانی است. در این فرآیند، با ایجاد تمرکز و آرامش عمیق، زمینه تغییرات مثبت و پایدار در ذهن و رفتار فراهم می‌شود.',
  cta: 'بیشتر درباره هیپنوتراپی',
  href: '/hypnotherapy',
  video: {
    src: '/videos/hypnotherapy.mp4',
    poster: videoPoster('cover2.jpg'),
    label: 'ویدئوی معرفی هیپنوتراپی',
    play: 'پخش ویدئوی هیپنوتراپی',
  },
} as const

export const services: {
  title: string
  description: string
  items: readonly ServiceItem[]
} = {
  title: 'خدمات تخصصی من',
  description:
    'ارائه خدمات تخصصی در زمینه‌های مختلف روان‌شناسی و هیپنوتراپی، با رویکردی علمی، انسانی و کاملاً محرمانه',
  items: [
    {
      slug: 'individual-counselling',
      icon: 'user',
      title: 'مشاوره فردی',
      description:
        'کمک به شناخت بهتر خود، مدیریت استرس و اضطراب، افسردگی و افزایش عزت‌نفس و آرامش درونی.',
    },
    {
      slug: 'couples-family',
      icon: 'users',
      title: 'مشاوره روابط و خانواده',
      description:
        'بهبود ارتباط عاطفی، حل تعارض‌ها، تقویت رابطه زوجین و ایجاد محیط سالم در خانواده.',
    },
    {
      slug: 'hypnotherapy',
      icon: 'spiral',
      title: 'هیپنوتراپی',
      description:
        'درمان مشکلات از طریق تغییر الگوهای ناخودآگاه، کاهش استرس و اضطراب، مدیریت ترس‌ها و فوبیاها و افزایش اعتمادبه‌نفس.',
    },
    {
      slug: 'psychoanalysis',
      icon: 'mindGrowth',
      title: 'روانکاوی تحلیلی',
      description:
        'درمان تخصصی اختلالات عاطفی، افسردگی، اضطراب، اختلالات خواب و سایر مشکلات روانی از طریق کاوش در تعارض‌های ناخودآگاه و رشد فردی.',
    },
    {
      slug: 'psychotherapy',
      icon: 'brain',
      title: 'روان‌درمانی',
      description: 'رویکردهای درمانی مبتنی بر شواهد:',
      bullets: [
        'درمان شناختی رفتاری (CBT)',
        'درمان مبتنی بر پذیرش و تعهد (ACT)',
        'طرحواره درمانی',
        'ذهن‌آگاهی (Mindfulness)',
      ],
    },
    {
      slug: 'personality-tests',
      icon: 'clipboard',
      title: 'تست شخصیت',
      description:
        'آزمون‌های استاندارد روان‌شناسی با تفسیر علمی، برای خودشناسی و ارزیابی اولیه پیش از شروع درمان.',
      bullets: [
        'شخصیت‌شناسی نئو (NEO)',
        'طرحواره‌های یانگ (YSQ)',
        'سازگاری زناشویی انریچ',
        'افسردگی بک و غربالگری بالینی',
      ],
      href: '/tests',
      cta: 'مشاهده آزمون‌ها',
    },
  ],
}

export const booking = {
  title: 'رزرو وقت مشاوره',
  description: 'برای رزرو جلسه مشاوره، تاریخ و ساعت مورد نظر خود را انتخاب کنید.',
  image: {
    src: '/images/booking-calendar.jpg',
    alt: 'تقویم رومیزی در کنار گلدان، نماد رزرو وقت مشاوره',
  },
  direct: {
    label: 'تماس مستقیم',
    availability: 'پاسخگویی همه روزه',
    hours: 'ساعت ۹ صبح تا ۸ شب',
  },
} as const

export const whyCounselling = {
  title: 'چرا مشاوره؟',
  items: [
    {
      icon: 'leaf' satisfies IconName,
      title: 'کاهش استرس و اضطراب',
      description: 'مدیریت بهتر فشارهای زندگی',
    },
    {
      icon: 'users' satisfies IconName,
      title: 'بهبود روابط و کیفیت زندگی',
      description: 'ایجاد ارتباط سالم‌تر با خود و دیگران',
    },
    {
      icon: 'user' satisfies IconName,
      title: 'افزایش اعتماد به نفس',
      description: 'باور به توانایی‌ها و رشد فردی',
    },
    {
      icon: 'heart' satisfies IconName,
      title: 'مدیریت بهتر احساسات',
      description: 'شناخت و کنترل هیجانات',
    },
    {
      icon: 'lotus' satisfies IconName,
      title: 'رسیدن به آرامش درونی',
      description: 'تعادل ذهن و روان',
    },
  ],
} as const

/**
 * The quick-links column's spine.
 *
 * Hrefs rather than labels, so `nav` keeps owning the wording and a rename
 * there reaches the footer. The order is the design's, not `nav`'s, and
 * /tests and /hypnotherapy are absent because the design's column omits them.
 * Booking is the one item that names itself: it lives in `cta` rather than
 * `nav`, because the header renders it as a button.
 */
const FOOTER_QUICK: readonly { href: string; label?: string }[] = [
  { href: '/' },
  { href: '/about' },
  { href: '/services' },
  { href: '/articles' },
  { href: cta.bookHref, label: 'رزرو نوبت' },
  { href: '/contact' },
]

export const footer = {
  tagline: 'با رویکردی علمی و انسانی، همراه شما در مسیر آرامش و رشد فردی.',
  servicesTitle: 'خدمات',
  quickTitle: 'دسترسی سریع',
  contactTitle: 'راه‌های ارتباطی',
  /** An href that no longer exists in `nav` drops out rather than going dead. */
  quickLinks: FOOTER_QUICK.flatMap((item) => {
    const label = item.label ?? nav.find((entry) => entry.href === item.href)?.label
    return label ? [{ label, href: item.href }] : []
  }),
  /** Accessible names for the icon-only links — there is no visible text. */
  social: { instagram: 'اینستاگرام', whatsapp: 'واتس‌اپ' },
  /**
   * No year. A literal one is wrong every January, and one computed at render
   * time would be frozen at whatever the last build saw on the five pages
   * that are prerendered.
   */
  credit: {
    label: 'طراحی سایت گروه لاگ',
    href: 'https://loggroup.ir',
    domain: 'loggroup.ir',
  },
} as const
