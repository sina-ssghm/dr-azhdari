/**
 * Copy for the testimonials section.
 *
 * The comments themselves live in the database — visitors submit them and the
 * practice approves them — so only the surrounding wording is here. The ten
 * that were published before that change are seeded, approved, by
 * `migrations/010_testimonials.sql`.
 */
export const testimonials = {
  title: 'تجربه مراجعان',
  description: 'بخشی از آنچه مراجعان درباره جلسه‌هایشان نوشته‌اند.',
  /** Stands in for a name where a comment carries no attribution. */
  anonymous: 'مراجع',
  empty: 'هنوز نظری ثبت نشده است. اولین نفر باشید.',

  form: {
    open: 'ثبت نظر شما',
    opening: 'در حال باز کردن…',
    title: 'ثبت نظر',
    intro:
      'اگر جلسه‌ای با ما داشته‌اید، خوشحال می‌شویم تجربه‌تان را بنویسید. نظر شما پس از بررسی منتشر می‌شود.',
    name: 'نام',
    nameHint: 'فقط نام کوچک؛ نام خانوادگی منتشر نمی‌شود.',
    country: 'کشور محل اقامت',
    countryPlaceholder: 'جست‌وجوی کشور',
    comment: 'نظر شما',
    commentHint: 'بین ۳۰ تا ۱۰۰۰ کاراکتر.',
    /** Shown while the comment is still too short to send. */
    needMore: (n: string) => `${n} کاراکتر دیگر لازم است`,
    /** Shown once it is long enough. */
    left: (n: string) => `${n} کاراکتر باقی مانده`,
    submit: 'ارسال نظر',
    sending: 'در حال ارسال…',
    cancel: 'انصراف',
    done: 'نظر شما ثبت شد',
    doneBody: 'ممنون که وقت گذاشتید. نظر شما پس از بررسی روی سایت منتشر خواهد شد.',
    close: 'بستن',
    /** Kept alongside the visible copy so the wording stays in one place. */
    errors: {
      name: 'لطفاً نام خود را وارد کنید.',
      quoteShort: 'نظر شما باید دست‌کم ۳۰ کاراکتر باشد.',
      quoteLong: 'نظر شما نباید بیشتر از ۱۰۰۰ کاراکتر باشد.',
      failed: 'ثبت نظر ناموفق بود. لطفاً دوباره تلاش کنید.',
    },
  },
} as const

/** Bounds shared by the form and the server action that re-checks it. */
export const QUOTE_MIN = 30
export const QUOTE_MAX = 1000
export const NAME_MAX = 40
