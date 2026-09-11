import type { IconName } from '@/components/icons'

type AdminNavItem = {
  href: string
  label: string
  icon: IconName
  /** Match the path exactly — only the dashboard, which is a prefix of the rest. */
  exact: boolean
}

export const adminNav: readonly AdminNavItem[] = [
  { href: '/admin', label: 'داشبورد', icon: 'monitor', exact: true },
  { href: '/admin/appointments', label: 'نوبت‌ها', icon: 'calendar', exact: false },
  { href: '/admin/tests', label: 'آزمون‌ها', icon: 'clipboard', exact: false },
  { href: '/admin/testimonials', label: 'نظرات مراجعان', icon: 'heart', exact: false },
  { href: '/admin/articles', label: 'مقالات', icon: 'document', exact: false },
  { href: '/admin/hours', label: 'ساعات کاری', icon: 'headset', exact: false },
  { href: '/admin/prices', label: 'تعرفه‌ها', icon: 'card', exact: false },
  { href: '/admin/discounts', label: 'کدهای تخفیف', icon: 'award', exact: false },
  { href: '/admin/settings', label: 'تنظیمات', icon: 'card', exact: false },
  { href: '/admin/password', label: 'تغییر رمز عبور', icon: 'shield', exact: false },
]

export const admin = {
  title: 'پنل مدیریت',
  subtitle: 'دکتر زهره اژدری',
  viewSite: 'مشاهده سایت',
  signOut: 'خروج از حساب',
  save: 'ذخیره تغییرات',
  saved: 'تغییرات ذخیره شد.',
  weekdays: ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'],
} as const
