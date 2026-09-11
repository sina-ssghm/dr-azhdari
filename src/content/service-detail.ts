import type { IconName } from '@/components/icons'
import { site, videoPoster } from '@/content/site'

/* ------------------------------------------------------------------ *
 * The long-form content behind a service card.
 *
 * `services.items` in site.ts already owns each service's slug, title and
 * one-line description — those are what the cards and the footer render, and
 * they are not repeated here. This file holds only what a full page adds.
 *
 * A service with no record here keeps the holding page. That is the whole
 * mechanism: `/services/[slug]` looks the slug up, renders the full page when
 * it finds something and `PagePlaceholder` when it does not, so the four
 * services still awaiting copy are unaffected by this one gaining a page.
 * ------------------------------------------------------------------ */

export type ServiceTopic = {
  icon: IconName
  title: string
  /** Omitted where a design's cards carry the title alone. */
  description?: string
}

export type ServiceDetail = {
  /**
   * A small Latin line above the title, where a page's design has one. Set
   * `dir="ltr"` when rendered — it is a Latin run in a Persian column.
   */
  eyebrow?: string
  /**
   * The promise under the title, set larger and bolder than the body. Some
   * designs open with a single paragraph instead and omit it.
   */
  lead?: string
  body: string
  /**
   * A photograph beside the opening text instead of a clip beneath it. Pages
   * carry one or the other: with both, the fold would be two competing images.
   */
  heroImage?: { src: string; alt: string }
  /** A booking button in the hero, for a page whose design opens with one. */
  heroCtaLabel?: string
  /** The flourish under the title, where a page's design carries one. */
  heroOrnament?: boolean
  video?: {
    src: string
    poster: string
    /** Describes the clip for anyone who cannot see it. */
    label: string
    /** The play button's accessible name. */
    play: string
  }
  topicsTitle: string
  topics: readonly ServiceTopic[]
  /**
   * Overrides the width of the topic row. Left unset it follows the count,
   * which is right for five or six one-line cards and wrong for six cards
   * whose copy runs to three lines — those want a 3x2 block instead.
   */
  topicColumns?: 3 | 5 | 6
  note?: { label: string; body: string }
  cta: {
    title: string
    body: string
    label: string
    /** A quieter second action beside the primary one, where a page has one. */
    secondary?: { label: string; href: string; icon: IconName }
    /** Named modalities, set as pills under the copy. */
    chips?: readonly string[]
    /** The flourish under the band's title, where a design carries one. */
    ornament?: boolean
    image: { src: string; alt: string }
  }
}

/*
  Not exported. Everything outside goes through `serviceDetail()`, so a caller
  cannot index this by a slug that does not exist and get `undefined` typed as
  a `ServiceDetail`.
*/
const details: Record<string, ServiceDetail> = {
  'individual-counselling': {
    lead: 'فضایی امن برای شنیده شدن، درک عمیق‌تر و مسیر روشن‌تر',
    body: 'در جلسات مشاوره فردی، با همراهی و حمایت حرفه‌ای، به شناخت بهتر خود، مدیریت چالش‌ها و ایجاد تغییرات مثبت در زندگی‌تان کمک می‌کنیم.',
    video: {
      src: '/videos/ind.mp4',
      poster: videoPoster('cover.jpg'),
      label: 'ویدئوی معرفی مشاوره فردی',
      play: 'پخش ویدئوی معرفی مشاوره فردی',
    },
    topicsTitle: 'مشاوره فردی برای چه موضوعاتی می‌تواند کمک‌کننده باشد؟',
    topics: [
      {
        icon: 'users',
        title: 'چالش‌های عاطفی و روابط',
        description: 'درک و مدیریت احساسات و بهبود روابط بین‌فردی',
      },
      {
        icon: 'signpost',
        title: 'تصمیم‌گیری‌های مهم زندگی',
        description: 'انتخاب آگاهانه و مسیر روشن‌تر',
      },
      {
        icon: 'brain',
        title: 'اضطراب و استرس',
        description: 'مدیریت افکار و هیجانات دشوار',
      },
      {
        icon: 'heart',
        title: 'عزت‌نفس و اعتماد به خود',
        description: 'تقویت باورها و احساس ارزشمندی',
      },
      {
        icon: 'lotus',
        title: 'خودشناسی و رشد فردی',
        description: 'شناخت بهتر خود و توانمندسازی فردی',
      },
    ],
    note: {
      label: 'نکته مهم',
      body: 'مشاوره فردی برای همه افرادی که به دنبال شناخت بهتر خود، بهبود کیفیت زندگی و ایجاد تغییرات مثبت هستند مناسب است. در جلسه‌ی اول، شرایط و نیازهای شما بررسی می‌شود تا مسیر مناسب‌تری برای ادامه جلسات انتخاب شود.',
    },
    cta: {
      title: 'اولین قدم، سرمایه‌گذاری روی خودتان است',
      body: 'در یک فضای امن و حرفه‌ای، همراه شما هستیم تا نسخه‌ی بهتر و آرام‌تر خودتان را بسازید.',
      label: 'رزرو جلسه مشاوره فردی',
      image: {
        src: '/images/book.jpg',
        alt: 'کتاب‌های یونگ، فروید و ناخودآگاه روی میز چوبی، کنار گلدان و مبل مطب',
      },
    },
  },
  hypnotherapy: {
    lead: 'دسترسی به آرامش و تغییر پایدار درونی',
    body: 'هیپنوتراپی یک روش علمی و ایمن است که با تمرکز و آرامش عمیق می‌تواند در کنار فرایند درمان به شما کمک کند الگوهای ذهنی، هیجانی و رفتاری خود را تغییر دهید.',
    video: {
      src: '/videos/hypnotherapy.mp4',
      poster: videoPoster('cover.jpg'),
      label: 'ویدئوی معرفی هیپنوتراپی',
      play: 'پخش ویدئوی معرفی هیپنوتراپی',
    },
    topicsTitle: 'هیپنوتراپی برای چه موضوعاتی می‌تواند کمک‌کننده باشد؟',
    topics: [
      {
        icon: 'brain',
        title: 'اضطراب و استرس',
        description: 'کاهش اضطراب، تنش و افکار منفی',
      },
      {
        icon: 'cloudRain',
        title: 'افسردگی خفیف تا متوسط',
        description: 'بهبود خلق‌وخو و افزایش انرژی و انگیزه',
      },
      {
        icon: 'moon',
        title: 'اختلالات خواب',
        description: 'بهبود کیفیت خواب، بی‌خوابی و کابوس‌ها',
      },
      {
        icon: 'linkBreak',
        title: 'ترک عادت‌ها و وابستگی‌ها',
        description: 'مثل سیگار، پرخوری، عادت کندن ناخن و …',
      },
      {
        icon: 'shield',
        title: 'ترس‌ها و فوبیاها',
        description: 'ترس از پرواز، ارتفاع، حیوانات یا موقعیت‌های خاص',
      },
      {
        icon: 'award',
        title: 'افزایش اعتمادبه‌نفس و عزت نفس',
        description: 'تقویت خودباوری و ایجاد نگرش مثبت نسبت به خود',
      },
    ],
    note: {
      label: 'نکته مهم',
      body: 'هیپنوتراپی برای همه افراد مناسب نیست. پیش از شروع جلسات، یک جلسه ارزیابی اولیه انجام می‌شود تا نیازها و شرایط شما بررسی شده و مناسب‌ترین مسیر برای شما مشخص گردد.',
    },
    cta: {
      title: 'آغاز مسیر آرامش و تغییر',
      body: 'در جلسه مشاوره اولیه، شرایط و اهداف شما بررسی می‌شود تا بهترین مسیر درمانی برایتان انتخاب شود.',
      label: 'رزرو جلسه ارزیابی اولیه',
      // Latin digits in the href — a tel: link with Persian numerals does not
      // dial. This is `site.phone`, the number every other call button on the
      // site uses; it is NOT the admin-editable footer number.
      secondary: {
        label: 'تماس مستقیم',
        href: `tel:${site.phone}`,
        icon: 'phone',
      },
      image: {
        src: '/images/book.jpg',
        alt: 'کتاب‌های یونگ، فروید و ناخودآگاه روی میز چوبی، کنار گلدان و مبل مطب',
      },
    },
  },
  psychotherapy: {
    eyebrow: 'PSYCHOTHERAPY',
    lead: 'فضایی امن برای تغییر، رشد و آرامش',
    body: 'روان‌درمانی فرایندی علمی و حمایتی است برای شناخت بهتر خود، مدیریت چالش‌های زندگی و حرکت به سمت تغییرات پایدار در جهت یک زندگی متعادل‌تر.',
    // A photograph rather than a clip: this page's design opens with the
    // consulting room, not with a piece to camera.
    heroImage: {
      src: '/images/cover3.jpg',
      alt: 'دکتر زهره اژدری پشت میز مطب، در حال نوشتن یادداشت جلسه',
    },
    heroCtaLabel: 'رزرو جلسه مشاوره',
    topicsTitle: 'روان‌درمانی برای چه موضوعاتی می‌تواند کمک‌کننده باشد؟',
    // Three across, not six: these descriptions run to three lines, and a
    // sixth of the row cannot hold them without shredding every one.
    topicColumns: 3,
    topics: [
      {
        icon: 'lotus',
        title: 'تنظیم هیجان‌ها',
        description: 'شناخت و مواجهه مؤثرتر با هیجان‌های دشوار',
      },
      {
        icon: 'cloudRain',
        title: 'افسردگی و خلق پایین',
        description:
          'کار روی افکار، رفتارها و الگوهایی که به تداوم خلق پایین کمک می‌کنند.',
      },
      {
        icon: 'brain',
        title: 'اضطراب و نگرانی',
        description: 'مدیریت افکار اضطرابی و الگوهای فکری ناکارآمد',
      },
      {
        icon: 'user',
        title: 'خودشناسی و الگوهای عمیق‌تر',
        description: 'شناخت نیازها، باورها و الگوهایی که در زندگی و روابط تکرار می‌شوند',
      },
      {
        icon: 'leaf',
        title: 'پذیرش و انعطاف‌پذیری روان‌شناختی',
        description: 'حرکت در جهت ارزش‌های شخصی با وجود افکار و احساسات دشوار',
      },
      {
        icon: 'cycle',
        title: 'الگوهای رفتاری ناکارآمد',
        description: 'شناخت الگوهای تکرارشونده و ایجاد پاسخ‌های انعطاف‌پذیرتر',
      },
    ],
    cta: {
      title: 'رویکردهای مورد استفاده در روان‌درمانی',
      body: 'با استفاده از رویکردهای علمی و مبتنی بر شواهد، فرایند درمان متناسب با نیازهای هر فرد طراحی می‌شود.',
      // Latin, and left in Latin: these are the modalities' own names, which
      // is how the field writes them and how a visitor would search for them.
      chips: ['CBT', 'ACT', 'Schema Therapy', 'Mindfulness'],
      label: 'رزرو جلسه مشاوره',
      secondary: {
        label: 'تماس با من',
        href: `tel:${site.phone}`,
        icon: 'phone',
      },
      image: {
        src: '/images/book.jpg',
        alt: 'کتاب‌های یونگ، فروید و ناخودآگاه روی میز چوبی، کنار گلدان و مبل مطب',
      },
    },
  },
  psychoanalysis: {
    eyebrow: 'ANALYTICAL PSYCHOANALYSIS',
    lead: 'کاوش در عمق ذهن، برای درک بهتر خود',
    body: 'روانکاوی تحلیلی فرصتی است برای شناخت ریشه‌های عمیق احساسات، الگوهای تکرارشونده و تجربه‌های ناآگاه که بر زندگی امروز ما اثر می‌گذارند. در این مسیر، با نگاهی ژرف‌تر به خود، امکان ایجاد تغییرات پایدار و زندگی معنادارتر فراهم می‌شود.',
    // The consulting-room shot with Jung and Freud on the desk, which is the
    // photograph this page's design opens with.
    heroImage: {
      src: '/images/cover2.jpg',
      alt: 'دکتر زهره اژدری پشت میز مطب، در حال یادداشت‌برداری',
    },
    heroOrnament: true,
    heroCtaLabel: 'رزرو جلسه مشاوره',
    topicsTitle: 'روانکاوی تحلیلی برای چه موضوعاتی می‌تواند کمک‌کننده باشد؟',
    topics: [
      {
        icon: 'heart',
        title: 'بهبود کیفیت زندگی',
        description: 'افزایش آگاهی، آزادی انتخاب و رضایت درونی',
      },
      {
        icon: 'knot',
        title: 'بحران‌های هویتی',
        description: 'یافتن معنا و انسجام در دوره‌های گذار زندگی',
      },
      {
        icon: 'brain',
        title: 'تعارض‌های درونی',
        description: 'درک تعارض‌های ناآگاه و احساسات سرکوب‌شده',
      },
      {
        icon: 'leaf',
        title: 'تجربه‌های دوران کودکی',
        description: 'کاوش در تأثیر تجربه‌های اولیه بر زندگی امروز',
      },
      {
        icon: 'users',
        title: 'الگوهای تکرارشونده',
        description: 'بررسی ریشه‌های الگوهای منفی در روابط و زندگی',
      },
      {
        icon: 'headProfile',
        title: 'خودشناسی عمیق',
        description: 'شناخت بهتر الگوهای فکری، هیجانی و رفتاری',
      },
    ],
    cta: {
      title: 'آغاز مسیری آگاهانه به سوی خود واقعی',
      body: 'در جلسات روانکاوی تحلیلی، با همراهی و در فضایی امن، به درک عمیق‌تر خود و ساختن زندگی اصیل‌تر می‌رسیم.',
      label: 'رزرو جلسه مشاوره',
      image: {
        src: '/images/book.jpg',
        alt: 'کتاب‌های یونگ، فروید و ناخودآگاه روی میز چوبی، کنار گلدان و مبل مطب',
      },
    },
  },
  'couples-family': {
    body: 'روابط سالم، مهارت می‌خواهد. در جلسات زوج‌درمانی و پیش از ازدواج، با شناخت بهتر خود و دیگری، برای ساختن رابطه‌ای آگاهانه‌تر قدم برمی‌دارید.',
    video: {
      src: '/videos/coup.mp4',
      poster: videoPoster('cover.jpg'),
      label: 'ویدئوی معرفی مشاوره روابط و خانواده',
      play: 'پخش ویدئوی معرفی مشاوره روابط و خانواده',
    },
    // The design drops the service's name here, unlike the other four — the
    // title is directly above it and repeating it reads as a stutter.
    topicsTitle: 'برای چه موضوعاتی می‌تواند کمک‌کننده باشد؟',
    topics: [
      {
        icon: 'homeHeart',
        title: 'ساختن رابطه‌ای پایدار و آگاهانه',
      },
      {
        icon: 'shield',
        title: 'تقویت اعتماد و صمیمیت',
      },
      {
        icon: 'users',
        title: 'مدیریت تعارض‌ها و اختلاف‌نظرها',
      },
      {
        icon: 'rings',
        title: 'آمادگی برای ازدواج و شناخت انتظارات',
      },
      {
        icon: 'chat',
        title: 'بهبود ارتباط و درک متقابل',
      },
    ],
    note: {
      label: 'نکته مهم',
      body: 'هر رابطه ویژگی‌های خاص خود را دارد. در جلسات اولیه، وضعیت و نیازهای شما بررسی می‌شود تا مسیر مناسب و مؤثر برای شما و رابطه‌تان طراحی گردد.',
    },
    cta: {
      title: 'برای رابطه‌ای سالم و آگاهانه، از یک گفت‌وگو شروع کنید.',
      ornament: true,
      body: 'جلسه مشاوره اولیه، فرصتی برای شناخت بهتر شما و انتخاب مسیر مناسب است.',
      label: 'رزرو جلسه مشاوره و ارزیابی اولیه',
      image: {
        src: '/images/book.jpg',
        alt: 'کتاب‌های یونگ، فروید و ناخودآگاه روی میز چوبی، کنار گلدان و مبل مطب',
      },
    },
  },
}

export function serviceDetail(slug: string): ServiceDetail | undefined {
  return details[slug]
}
