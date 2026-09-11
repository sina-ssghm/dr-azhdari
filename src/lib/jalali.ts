/**
 * Minimal Jalali (Solar Hijri) calendar helpers.
 *
 * Conversion is delegated to `Intl` with the `persian` calendar rather than
 * hand-rolling the arithmetic or pulling in a date library — the platform
 * already ships a correct implementation, including leap years.
 *
 * Every date is normalised to 12:00 UTC. Anchoring at midday means a DST shift
 * or a timezone offset can never push a date across a day boundary, which is
 * the usual source of off-by-one bugs in calendar grids.
 */

export type JalaliParts = { jy: number; jm: number; jd: number }

const persianParts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
})

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const

/** Persian week runs Saturday → Friday. */
export const WEEKDAY_INITIALS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const

export const WEEKDAY_NAMES = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
] as const

export function toJalali(date: Date): JalaliParts {
  const parts = persianParts.formatToParts(date)
  // Some runtimes append an era ("1403 AP"), so keep digits only.
  const value = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value.replace(/\D/g, '') ?? 0)

  return { jy: value('year'), jm: value('month'), jd: value('day') }
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** Today, normalised to 12:00 UTC. Call on the client — never at build time. */
export function today(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12))
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime()
}

/** Gregorian date of day 1 of the Jalali month containing `date`. */
export function startOfJalaliMonth(date: Date): Date {
  return addDays(date, -(toJalali(date).jd - 1))
}

/** 29, 30 or 31 — derived rather than tabulated, so leap years are free. */
export function jalaliMonthLength(monthStart: Date): number {
  const { jm } = toJalali(monthStart)
  let length = 28
  while (toJalali(addDays(monthStart, length)).jm === jm) length += 1
  return length
}

/** 0 = Saturday … 6 = Friday. */
export function persianWeekday(date: Date): number {
  return (date.getUTCDay() + 1) % 7
}

export type CalendarCell = {
  date: Date
  jd: number
  inMonth: boolean
  isToday: boolean
  isPast: boolean
}

export type MonthGrid = {
  jy: number
  jm: number
  label: string
  cells: CalendarCell[]
}

export function buildMonthGrid(anchor: Date, now: Date): MonthGrid {
  const monthStart = startOfJalaliMonth(anchor)
  const { jy, jm } = toJalali(monthStart)
  const lead = persianWeekday(monthStart)

  // Always six weeks. A 5- vs 6-row month would otherwise resize the card as
  // you page through, and it keeps the loading skeleton the same height.
  const total = 42
  const cells: CalendarCell[] = []

  for (let i = 0; i < total; i += 1) {
    const date = addDays(monthStart, i - lead)
    const parts = toJalali(date)
    cells.push({
      date,
      jd: parts.jd,
      inMonth: parts.jy === jy && parts.jm === jm,
      isToday: isSameDay(date, now),
      isPast: date.getTime() < now.getTime(),
    })
  }

  return { jy, jm, label: `${JALALI_MONTHS[jm - 1]} ${jy}`, cells }
}

/** e.g. "چهارشنبه" + "۲۳ خرداد ۱۴۰۳" */
export function describeDate(date: Date): { weekday: string; full: string } {
  const { jy, jm, jd } = toJalali(date)
  return {
    weekday: WEEKDAY_NAMES[persianWeekday(date)] ?? '',
    full: `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`,
  }
}
