import type { IconName } from '@/components/icons'

/* ------------------------------------------------------------------ *
 * Copy and options for the reservation page. Phase 1 is UI only — the
 * services, time slots and payment methods below are static. When the
 * admin panel lands, `slots` and `services` become database reads and
 * everything else stays put.
 * ------------------------------------------------------------------ */

/**
 * Bounds on a single booking. A visitor books the same service, for the same
 * person, at up to `maxAppointments` different date/times, none more than
 * `monthsAhead` months out. Read by the client (calendar cap, add guard) and
 * re-enforced on the server, so the two never drift.
 */
export const bookingLimits = {
  maxAppointments: 10,
  monthsAhead: 3,
} as const

export const bookingPage = {
  title: 'رزرو جلسه مشاوره',
  subtitle: 'در چند مرحله ساده وقت مشاوره خود را رزرو کنید',

  steps: [
    { id: 'service', label: 'انتخاب نوع مشاوره', icon: 'user' satisfies IconName },
    { id: 'datetime', label: 'انتخاب تاریخ و زمان', icon: 'calendar' satisfies IconName },
    { id: 'details', label: 'اطلاعات شخصی', icon: 'user' satisfies IconName },
    { id: 'payment', label: 'پرداخت', icon: 'card' satisfies IconName },
  ],

  service: {
    title: 'نوع مشاوره را انتخاب کنید',
    description: 'این مشاوره فقط به صورت آنلاین به صورت تماس صوتی و تصویری است.',
    options: [
      {
        id: 'individual',
        icon: 'user' satisfies IconName,
        title: 'مشاوره فردی',
        description: 'رشد فردی، مدیریت استرس و اضطراب، افسردگی و افزایش عزت نفس',
        durations: [60],
        notice: null,
      },
      {
        id: 'couple',
        icon: 'users' satisfies IconName,
        title: 'مشاوره روابط و خانواده',
        description: 'بهبود ارتباط عاطفی، حل تعارض‌ها و تقویت رابطه زوجین',
        // Two people to hear out, so the session runs longer and the length
        // is the client's choice.
        durations: [90, 120],
        notice: null,
      },
      {
        id: 'hypnotherapy',
        icon: 'hypnotherapy' satisfies IconName,
        title: 'هیپنوتراپی (هیپنوتیزم درمانی)',
        description:
          'درمان مشکلات از طریق تغییر الگوهای ناخودآگاه و دسترسی به ضمیر ناخودآگاه',
        durations: [60],
        // One hour, but the visitor must be assessed first.
        notice:
          'برگزاری جلسه هیپنوتراپی نیازمند تشخیص پزشک می‌باشد. لطفاً در ابتدا نوبت مشاوره فردی رزرو کنید.',
      },
      {
        id: 'psychoanalysis',
        icon: 'brain' satisfies IconName,
        title: 'روانکاوی',
        description:
          'کاوش ناخودآگاه، حل تعارض‌های ریشه‌ای و شناخت عمیق الگوهای رفتاری',
        durations: [60],
        notice: null,
      },
    ],
  },

  duration: {
    legend: 'مدت جلسه را انتخاب کنید',
    hint: 'ابتدا مدت جلسه را مشخص کنید تا ساعت‌های مناسب نمایش داده شوند.',
    label: (minutes: number) =>
      minutes % 60 === 0
        ? `${minutes / 60} ساعت`
        : `${Math.floor(minutes / 60)} ساعت و ${minutes % 60} دقیقه`,
  },

  datetime: {
    title: 'تاریخ و زمان را انتخاب کنید',
    description:
      'یک روز را از تقویم انتخاب کنید و ساعت دلخواه را بزنید. می‌توانید تا ۱۰ نوبت (حداکثر تا ۳ ماه آینده) را در همین صفحه رزرو کنید؛ برای افزودن نوبت بیشتر، روز یا ساعت دیگری را انتخاب کنید.',
    emptyDay: 'برای دیدن ساعت‌های آزاد، یک روز را از تقویم انتخاب کنید.',
    selected: (count: number) => `${count} نوبت انتخاب شده`,
    pickDuration: 'ابتدا مدت جلسه را انتخاب کنید.',
    /** The running list of chosen appointments, below the time grid. */
    listTitle: 'نوبت‌های انتخاب‌شده',
    addHint: 'برای افزودن نوبت بیشتر، روز یا ساعت دیگری را انتخاب کنید.',
    maxReached: (max: number) =>
      `به حداکثر تعداد نوبت (${max}) رسیدید. برای افزودن نوبت جدید، ابتدا یکی را حذف کنید.`,
    emptyList: 'هنوز نوبتی انتخاب نکرده‌اید.',
    remove: 'حذف نوبت',
  },

  details: {
    title: 'اطلاعات شخصی خود را وارد کنید',
    description: 'لطفاً اطلاعات خود را به درستی وارد نمایید.',
    fields: {
      name: { label: 'نام و نام خانوادگی', placeholder: 'نام و نام خانوادگی' },
      phone: {
        label: 'شماره تماس',
        placeholder: '912 345 6789',
        country: 'کد کشور',
        searchCountry: 'جست‌وجوی کشور یا کد',
        noCountry: 'کشوری پیدا نشد.',
        invalid: 'شماره تماس با کد کشور انتخاب‌شده همخوانی ندارد.',
      },
      email: { label: 'ایمیل (اختیاری)', placeholder: 'example@email.com' },
      notes: {
        label: 'توضیحات (اختیاری)',
        placeholder: 'در صورت نیاز توضیحات خود را بنویسید...',
      },
    },
  },

  payment: {
    title: 'محل اقامت خود را انتخاب کنید',
    description: 'روش‌های پرداخت بر اساس محل اقامت شما متفاوت است.',
    selected: 'انتخاب شد',
    changeRegion: 'تغییر محل اقامت',
    methodTitle: 'روش پرداخت را انتخاب کنید',
    regions: [
      {
        id: 'iran',
        title: 'داخل ایران',
        subtitle: 'پرداخت از طریق کارت به کارت',
      },
      {
        id: 'abroad',
        title: 'خارج از ایران',
        subtitle: 'پرداخت با تتر یا کارت به کارت',
      },
    ],
    methods: [
      {
        id: 'iran_card',
        region: 'iran',
        title: 'کارت به کارت',
        subtitle: 'پرداخت به حساب ایرانی، به تومان',
        description: 'پس از رزرو، اطلاعات کارت و مبلغ نهایی نمایش داده می‌شود.',
      },
      {
        id: 'abroad_crypto',
        region: 'abroad',
        title: 'پرداخت با تتر (USDT)',
        subtitle: 'پرداخت امن و سریع از طریق شبکه تتر',
        description: 'پس از رزرو، آدرس کیف پول و کد QR نمایش داده می‌شود.',
      },
      {
        id: 'abroad_card',
        region: 'abroad',
        title: 'کارت به کارت (تومان)',
        subtitle: 'واریز به حساب ایرانی از طریق کارت',
        description: 'پس از رزرو، اطلاعات کارت و مبلغ نهایی نمایش داده می‌شود.',
      },
    ],
  },

  nav: {
    next: 'ادامه',
    back: 'مرحله قبل',
    toReview: 'بررسی و تأیید',
  },

  submitting: 'در حال ثبت…',

  discount: {
    label: 'کد تخفیف (اختیاری)',
    placeholder: 'کد تخفیف را وارد کنید',
    apply: 'اعمال',
    remove: 'حذف کد',
    applied: 'کد تخفیف اعمال شد.',
  },

  summary: {
    price: 'مبلغ جلسه',
    payable: 'مبلغ قابل پرداخت',
    notSet: 'قیمت هنوز تعیین نشده است — لطفاً تلفنی هماهنگ کنید.',
  },

  incomplete: {
    service: 'ابتدا نوع مشاوره را انتخاب کنید.',
    duration: 'مدت جلسه را انتخاب کنید.',
    datetime: 'تاریخ و ساعت جلسه را انتخاب کنید.',
    details: 'نام و شماره تماس خود را وارد کنید.',
    method: 'روش پرداخت را انتخاب کنید.',
  },

  review: {
    title: 'اطلاعات رزرو را تأیید کنید',
    body: 'پیش از پرداخت، لطفاً اطلاعات زیر را با دقت بررسی کنید. شماره تماس و ایمیل برای هماهنگی و ارسال لینک جلسه استفاده می‌شود.',
    edit: 'ویرایش اطلاعات',
    confirm: 'ادامه پرداخت',
    service: 'نوع مشاوره',
    duration: 'مدت هر جلسه',
    sessions: 'جلسات',
    name: 'نام و نام خانوادگی',
    phone: 'شماره تماس',
    email: 'ایمیل',
    location: 'محل اقامت',
    method: 'روش پرداخت',
    total: 'مبلغ قابل پرداخت',
  },

  pay: {
    title: 'پرداخت رزرو',
    subtitle: 'پس از واریز، رسید را بارگذاری کنید تا رزرو شما نهایی شود.',
    cardTitle: 'پرداخت کارت به کارت',
    cardNumber: 'شماره کارت',
    sheba: 'شماره شبا',
    holder: 'به نام',
    usdtTitle: 'پرداخت با تتر (USDT)',
    address: 'آدرس کیف پول',
    network: 'شبکه',
    scan: 'برای پرداخت، این کد را با کیف پول خود اسکن کنید.',
    copy: 'کپی',
    copied: 'کپی شد',
    paid: 'پرداخت کردم',
    notConfigured: 'اطلاعات پرداخت هنوز تنظیم نشده است. لطفاً برای هماهنگی تماس بگیرید.',
    amount: 'مبلغ قابل پرداخت',
  },

  receipt: {
    title: 'بارگذاری رسید پرداخت',
    body: 'تصویر یا فایل رسید پرداخت خود را بارگذاری کنید تا رزرو شما بررسی و تأیید شود.',
    field: 'فایل رسید',
    hint: 'تصویر (JPG، PNG، WebP) یا PDF — حداکثر ۵ مگابایت',
    drop: 'فایل رسید را اینجا رها کنید',
    browse: 'یا برای انتخاب کلیک کنید',
    change: 'تغییر فایل',
    remove: 'حذف',
    cancel: 'لغو ارسال',
    cancelled: 'ارسال لغو شد. می‌توانید فایل دیگری انتخاب کنید و دوباره تلاش کنید.',
    sending: 'در حال ارسال…',
    checking: 'در حال بررسی فایل…',
    stalled:
      'پاسخی از سرور دریافت نشد. ممکن است رسید شما ثبت شده باشد — صفحه را تازه کنید و اگر همچنان این فرم را دیدید دوباره تلاش کنید.',
    submit: 'ارسال رسید',
    done: 'رسید شما ثبت شد',
    doneBody:
      'رزرو شما در انتظار تأیید پرداخت است. پس از بررسی، نتیجه از طریق تماس یا ایمیل به شما اطلاع داده می‌شود.',
    pending: 'در انتظار تأیید پرداخت',
  },

  success: {
    title: 'رزرو شما ثبت شد',
    body: 'به‌زودی برای هماهنگی نهایی با شما تماس می‌گیریم. لطفاً پس از واریز، رسید پرداخت را برای ما ارسال کنید.',
    again: 'ثبت رزرو جدید',
  },

  notice:
    'پس از تکمیل رزرو، اطلاعات پرداخت برای شما نمایش داده می‌شود و پس از واریز، کافیست رسید پرداخت را برای ما ارسال کنید.',
} as const

export type ServiceId = (typeof bookingPage.service.options)[number]['id']
export type PaymentRegion = (typeof bookingPage.payment.regions)[number]['id']
