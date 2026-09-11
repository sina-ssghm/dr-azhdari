import type { Metadata } from 'next'
import { BookingFlow } from '@/components/booking/booking-flow'
import { getOpenWeekdays } from '@/server/appointments'

export const metadata: Metadata = {
  title: 'رزرو جلسه مشاوره',
  description:
    'رزرو آنلاین جلسه مشاوره روان‌شناسی و هیپنوتراپی — انتخاب نوع مشاوره، تاریخ و ساعت، و ثبت اطلاعات تماس.',
}

// Availability and prices are live data; never prerender this page.
export const dynamic = 'force-dynamic'

/**
 * Reservation page. Deliberately has no hero — the visitor arrived here to
 * complete a task, so the flow starts immediately below the header.
 *
 * If the database is unreachable the page still renders: no days are open,
 * rather than the whole route 500-ing. Prices are not passed at all — the
 * review step asks the server for a quote, so the tariff table never reaches
 * the browser.
 */
export default async function BookingPage() {
  const openWeekdays = await getOpenWeekdays().catch(() => [])

  return <BookingFlow openWeekdays={openWeekdays} />
}
