import type { IconName } from '@/components/icons'

/* ------------------------------------------------------------------ *
 * «آشنایی با من» — every string the page says, and the fourteen scans.
 *
 * Same contract as site.ts: components render this and never spell a Persian
 * word themselves. That includes the strings only a screen reader ever hears
 * — `aria-roledescription`, the arrows' names, the viewer's position line —
 * which are copy as much as a heading is. The testimonials slider writes its
 * own; this one does not.
 *
 * The alt text is the only record of what is actually printed on these
 * documents. It was read off the scans and cannot be reconstructed from the
 * markup, which is the other reason it lives here rather than in a component.
 * ------------------------------------------------------------------ */

export type Credential = {
  /**
   * How the viewer addresses a scan. A stable string rather than a position
   * in an array: the client has already renamed one file out of the gallery
   * and into the featured row, and an index would have silently re-pointed
   * every entry after it.
   */
  id: string
  src: string
  /**
   * The scan's own pixels, so next/image can reserve the right box before the
   * file arrives. They are not one shape — the set runs from 900×572 to
   * 900×705 — and a single assumed ratio would shift the viewer under the
   * reader on nine of the fourteen.
   */
  width: number
  height: number
  title: string
  issuer: string
  /**
   * What somebody who cannot see the scan is told it says. Read once, in the
   * viewer, where the image is the content; the thumbnails carry `alt=""`
   * because the button around them already has a name.
   */
  alt: string
}

const DOCS = '/images/docs'

const ORGANISATION = 'سازمان نظام روان‌شناسی و مشاوره جمهوری اسلامی ایران'
const HEALTH_MINISTRY = 'وزارت بهداشت، درمان و آموزش پزشکی'

/** The main document. It gets a section of the page to itself. */
const licence: Credential = {
  id: 'parvaneh',
  src: `${DOCS}/parv.jpg`,
  width: 900,
  height: 613,
  title: 'پروانه اشتغال تخصصی',
  issuer: ORGANISATION,
  alt: 'پروانه اشتغال تخصصی روان‌شناسی بالینی به نام دکتر زهره اژدری، شماره ۲۹۹۹۵، صادرشده از سوی سازمان نظام روان‌شناسی و مشاوره جمهوری اسلامی ایران در تاریخ ۱۴۰۴/۰۹/۰۴ و معتبر تا ۱۴۰۷/۰۹/۰۴ برای فعالیت در شهر شیراز.',
}

/**
 * The three the client singled out — «these are more important».
 *
 * Which three is the client's call and has already changed once: the Millon
 * interpretation certificate started here and was traded for the
 * psychoanalysis one. Membership is therefore a property of these two arrays
 * and nothing else — filenames carry no meaning, and `3.jpg` sits in the
 * gallery today despite its name.
 *
 * Featured or gallery, never both: a scan in two rows would also give the
 * lightbox two indexes for one document.
 */
const featured: readonly Credential[] = [
  {
    id: 'clinical-hypnosis',
    src: `${DOCS}/1.jpg`,
    width: 900,
    height: 659,
    title: 'هیپنوتیزم بالینی',
    issuer: 'انجمن هیپنوتیزم و هیپنوتراپی آسیا',
    alt: 'گواهی دستاورد (Certificate of Achievement) در دوره «هیپنوتیزم بالینی»، صادرشده از سوی انجمن هیپنوتیزم و هیپنوتراپی آسیا در مارس ۲۰۲۴.',
  },
  {
    id: 'premarital-counselling',
    src: `${DOCS}/2.jpg`,
    width: 900,
    height: 619,
    title: 'کارگاه آموزشی مشاوره پیش از ازدواج',
    issuer: `${ORGANISATION} — مؤسسه رشد`,
    alt: 'گواهی‌نامه شرکت در کارگاه تخصصی «آموزشی مشاوره پیش از ازدواج» به مدت هشت ساعت، صادرشده از سوی سازمان نظام روان‌شناسی و مشاوره جمهوری اسلامی ایران با همکاری مؤسسه خدمات روان‌شناختی رشد.',
  },
  {
    id: 'psychoanalysis-basics',
    src: `${DOCS}/photo_13_2026-09-08_16-08-42.jpg`,
    width: 900,
    height: 592,
    title: 'کارگاه اصول پایه‌ای روان‌کاوی',
    issuer: `دانشگاه علوم پزشکی شیراز — ${HEALTH_MINISTRY}`,
    alt: 'گواهی شرکت در کارگاه «اصول پایه‌ای روان‌کاوی ۲» برگزارشده در اولین کنگره بین‌المللی پیشگیری، درمان، کاهش آسیب و بازتوانی بیماران با اختلالات مصرف مواد، به مدت ۲ ساعت در دانشگاه علوم پزشکی شیراز، با تأیید وزارت بهداشت، درمان و آموزش پزشکی، ستاد مبارزه با مواد مخدر و انجمن روان‌پزشکان جامعه‌نگر.',
  },
]

/** Everything else, in the order the scans were catalogued. */
const gallery: readonly Credential[] = [
  {
    id: 'premarital-process',
    src: `${DOCS}/photo_2_2026-09-08_16-08-42.jpg`,
    width: 900,
    height: 705,
    title: 'کارگاه آموزش فرایند پیش از ازدواج',
    issuer: ORGANISATION,
    alt: 'گواهینامه شرکت در کارگاه تخصصی «آموزش فرایند پیش از ازدواج» به مدت هشت ساعت، صادرشده از سوی سازمان نظام روان‌شناسی و مشاوره جمهوری اسلامی ایران با همکاری مؤسسه خدمات روان‌شناختی رشد.',
  },
  {
    id: 'millon-scoring',
    src: `${DOCS}/photo_3_2026-09-08_16-08-42.jpg`,
    width: 900,
    height: 608,
    title: 'کارگاه اجرا و نمره‌گذاری تست میلون',
    issuer: ORGANISATION,
    alt: 'گواهینامه شرکت در کارگاه آموزشی تخصصی «تست میلون: اجرا و نمره‌گذاری» به مدت چهار ساعت، صادرشده از سوی سازمان نظام روان‌شناسی و مشاوره جمهوری اسلامی ایران.',
  },
  {
    id: 'relapse-mindfulness-org',
    src: `${DOCS}/photo_4_2026-09-08_16-08-42.jpg`,
    width: 900,
    height: 681,
    title: 'کارگاه مدیریت بازگشت به اعتیاد با ذهن‌آگاهی',
    issuer: ORGANISATION,
    alt: 'گواهینامه شرکت در کارگاه آموزشی تخصصی «مدیریت بازگشت به اعتیاد با کمک رویکرد ذهن‌آگاهی» به مدت چهار ساعت، صادرشده از سوی سازمان نظام روان‌شناسی و مشاوره جمهوری اسلامی ایران.',
  },
  {
    id: 'relapse-mindfulness-shiraz',
    src: `${DOCS}/photo_5_2026-09-08_16-08-42.jpg`,
    width: 900,
    height: 600,
    title: 'کارگاه مدیریت بازگشت به اعتیاد با رویکرد ذهن‌آگاهی',
    issuer: `${HEALTH_MINISTRY} — دانشگاه علوم پزشکی شیراز`,
    alt: 'تصویر گواهی شرکت در کارگاه «مدیریت بازگشت به اعتیاد با کمک رویکرد ذهن‌آگاهی» که در جریان اولین کنگره بین‌المللی پیشگیری، درمان، کاهش آسیب و بازتوانی بیماران با اختلالات مصرف مواد در دانشگاه علوم پزشکی شیراز برگزار شده و از سوی وزارت بهداشت، درمان و آموزش پزشکی و ستاد مبارزه با مواد مخدر صادر شده است.',
  },
  {
    id: 'substance-congress',
    src: `${DOCS}/photo_6_2026-09-08_16-08-42.jpg`,
    width: 900,
    height: 597,
    title: 'کنگره بین‌المللی درمان اختلالات مصرف مواد',
    issuer: `${HEALTH_MINISTRY} — ستاد مبارزه با مواد مخدر`,
    alt: 'تصویر گواهی شرکت در اولین کنگره بین‌المللی پیشگیری، درمان، کاهش آسیب و بازتوانی بیماران با اختلالات مصرف مواد، صادرشده از سوی وزارت بهداشت، درمان و آموزش پزشکی و ستاد مبارزه با مواد مخدر.',
  },
  {
    id: 'couples-infidelity',
    src: `${DOCS}/photo_7_2026-09-08_16-08-42.jpg`,
    width: 900,
    height: 613,
    title: 'کارگاه زوج‌درمانی در حوزه پیمان‌شکنی',
    issuer: 'دانشگاه آزاد اسلامی واحد علوم و تحقیقات فارس',
    alt: 'تصویر گواهی شرکت در کارگاه هشت‌ساعته زوج‌درمانی در حوزه پیمان‌شکنی که در دانشگاه آزاد اسلامی واحد علوم و تحقیقات فارس برگزار شده است.',
  },
  {
    id: 'millon-interpretation-congress',
    src: `${DOCS}/photo_8_2026-09-08_16-08-42.jpg`,
    width: 900,
    height: 575,
    title: 'کارگاه تفسیر تست میلون',
    issuer: `${HEALTH_MINISTRY} و ستاد مبارزه با مواد مخدر`,
    alt: 'گواهی شرکت در کارگاه «تفسیر تست میلون» که در جریان اولین کنگره بین‌المللی پیشگیری، درمان، کاهش آسیب و بازتوانی بیماران با اختلالات مصرف مواد در دانشگاه علوم پزشکی شیراز برگزار شده و با تأیید وزارت بهداشت، درمان و آموزش پزشکی، ستاد مبارزه با مواد مخدر و انجمن روان‌پزشکان جامعه‌نگر صادر شده است.',
  },
  {
    id: 'millon-theory',
    src: `${DOCS}/photo_10_2026-09-08_16-08-42.jpg`,
    width: 900,
    height: 596,
    title: 'کارگاه تئوری تکمیلی تست میلون',
    issuer: `${HEALTH_MINISTRY} و ستاد مبارزه با مواد مخدر`,
    alt: 'گواهی شرکت در کارگاه «تئوری تکمیلی تست میلون» به‌عنوان پیش‌نیاز کارگاه‌های عملی، برگزارشده در اولین کنگره بین‌المللی پیشگیری، درمان، کاهش آسیب و بازتوانی بیماران با اختلالات مصرف مواد در دانشگاه علوم پزشکی شیراز.',
  },
  {
    id: 'millon-workshop-shiraz',
    src: `${DOCS}/photo_11_2026-09-08_16-08-42.jpg`,
    width: 900,
    height: 604,
    title: 'کارگاه تست میلون',
    issuer: `دانشگاه علوم پزشکی شیراز — ${HEALTH_MINISTRY}`,
    alt: 'گواهی شرکت در کارگاه «تست میلون: اجرا و نمره‌گذاری» برگزارشده در اولین کنگره بین‌المللی پیشگیری، درمان، کاهش آسیب و بازتوانی بیماران با اختلالات مصرف مواد، به مدت ۲ ساعت در دانشگاه علوم پزشکی شیراز، با تأیید وزارت بهداشت، درمان و آموزش پزشکی، ستاد مبارزه با مواد مخدر و انجمن روان‌پزشکان جامعه‌نگر.',
  },
  {
    id: 'millon-interpretation',
    src: `${DOCS}/3.jpg`,
    width: 900,
    height: 572,
    title: 'کارگاه تخصصی تفسیر تست میلون',
    issuer: ORGANISATION,
    alt: 'گواهی‌نامه شرکت در کارگاه تخصصی «تفسیر تست میلون»، صادرشده از سوی سازمان نظام روان‌شناسی و مشاوره جمهوری اسلامی ایران.',
  },
]

export const credentials = { licence, featured, gallery } as const

/**
 * The whole collection in reading order, and the only list the viewer indexes.
 *
 * The three sections render the very same objects out of it, so paging crosses
 * the section breaks: a visitor who opened the licence carries on into the
 * certificates rather than meeting an invisible wall the page drew for layout
 * reasons. Two separate lists would also make «۳ از ۱۴» count off a total that
 * is not what is on the page.
 */
export const allCredentials: readonly Credential[] = [licence, ...featured, ...gallery]

export const about = {
  metaTitle: 'آشنایی با من',
  metaDescription:
    'دکتر زهره اژدری، روان‌شناس و مشاور در شیراز — مسیر حرفه‌ای، رویکرد درمانی، پروانه اشتغال تخصصی و گواهی‌های آموزشی.',

  hero: {
    /** Latin, so it is rendered inside an inline `dir="ltr"` box. */
    eyebrow: 'ABOUT ME',
    title: 'دکتر زهره اژدری',
    role: 'روانشناس و مشاور',
    /*
      Her membership number with سازمان نظام روان‌شناسی و مشاوره, the number that
      lets someone verify her registration. It is on the workshop certificate in
      the gallery below; repeated here because nobody digs through scans to find
      a credential.
    */
    boardCode: 'کد نظام روانشناسی (۱۱۳۰۷)',
    quote: '«باور دارم هر انسان، حق یک زندگی آرام‌تر، سالم‌تر و معنادارتر را دارد.»',
    body: 'در مسیر حرفه‌ای خود، همواره تلاش کرده‌ام با رویکردی علمی، انسان‌محور و مبتنی بر احترام و اعتماد، همراه مراجعانم باشم تا بتوانند با آگاهی بیشتر، کیفیت زندگی خود را بهبود بخشند و به نسخه‌ی اصیل‌تر و آرام‌تر خود نزدیک‌تر شوند.',
    image: {
      src: '/images/cover4.jpg',
      /*
        The photograph carries «آرامش آغاز یک زندگی بهتر است ...» as part of the
        image, so the alt says it too. Text set into a picture is invisible to a
        screen reader, and leaving it out would drop a line of the page's copy
        for anyone not looking at it.
      */
      alt: 'دکتر زهره اژدری پشت میز مطب خود، در فضایی آرام با گیاه، کتاب‌های روان‌شناسی و نور طبیعی. روی تصویر نوشته شده: آرامش آغاز یک زندگی بهتر است ...',
    },
  },

  cards: [
    {
      icon: 'signpost' satisfies IconName,
      title: 'مسیر حرفه‌ای من',
      body: 'من دکتر زهره اژدری، روان‌شناس و مشاور با سال‌ها فعالیت در حوزه روان‌شناسی، روان‌درمانی و مشاوره، در کنار شما هستم تا در مسیر شناخت بهتر خود، حل چالش‌های زندگی و ساختن آینده‌ای روشن‌تر همراهتان باشم. تجربه کار با مراجعان در شرایط و نیازهای مختلف به من آموخته است که هر انسان، با درک، احترام و حمایت علمی می‌تواند تغییرات مثبت و پایدار در زندگی خود ایجاد کند.',
    },
    {
      /* The design marks this card with a leaf. The other takes the fingerpost,
         so the pair reads as a route and a manner of travelling it. */
      icon: 'leaf' satisfies IconName,
      title: 'رویکرد من',
      body: 'در جلسات مشاوره، فضایی امن، بدون قضاوت و مبتنی بر احترام فراهم می‌کنم تا بتوانید با آرامش درباره دغدغه‌های خود صحبت کنید و برای رسیدن به اهداف فردی و رابطه‌ای‌تان مسیر مشخص‌تری پیدا کنید.',
    },
  ],

  licence: {
    title: 'مجوزها و صلاحیت‌های حرفه‌ای',
    body: 'دارای پروانه اشتغال تخصصی از سازمان نظام روان‌شناسی و مشاوره جمهوری اسلامی ایران با شماره ۲۹۹۹۵ و ارائه خدمات روان‌شناسی و مشاوره در حوزه‌های مختلف سلامت روان.',
    action: 'مشاهده تصویر کامل پروانه',
  },

  featured: { title: 'مدارک شاخص' },

  gallery: {
    title: 'سایر آموزش‌ها و گواهی‌های تخصصی',
    description: 'برای دیدن هر گواهی در اندازه‌ی بزرگ و خوانا، روی آن بزنید.',
    /** Names the strip for a screen reader; there is no visible label. */
    label: 'گالری گواهی‌های تخصصی',
    roleDescription: 'اسلایدر',
    listLabel: (count: string) => `${count} گواهی تخصصی`,
    previous: 'گواهی‌های قبلی',
    next: 'گواهی‌های بعدی',
  },

  viewer: {
    /* No separate label for the dialog: it is named by the document's own
       title through `aria-labelledby`, which changes as the visitor pages, so
       a fixed «نمایشگر مدارک» would only say less. */
    close: 'بستن',
    previous: 'مدرک قبلی',
    next: 'مدرک بعدی',
    position: (current: string, total: string) => `${current} از ${total}`,
    openOriginal: 'باز کردن تصویر اصلی',
  },

  closing: {
    title: 'همراه در مسیر زندگی بهتر',
    body: 'اگر آماده‌اید قدم اول را بردارید، وقت مشاوره‌ی خود را رزرو کنید تا در فضایی امن و بدون قضاوت گفت‌وگو را آغاز کنیم.',
  },

  /**
   * A thumbnail's accessible name. It is a control that opens the document,
   * not the document itself — the scan's own description lives on the image
   * inside the viewer, where somebody is actually reading it.
   */
  viewLarger: (title: string) => `مشاهده «${title}» در اندازه بزرگ`,
} as const
