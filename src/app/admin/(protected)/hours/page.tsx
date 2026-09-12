import type { Metadata } from 'next'
import { HoursEditor } from './hours-editor'
import { PageHeader } from '@/components/admin/ui'
import { SLOT_STEP_MINUTES } from '@/server/appointments'
import { getWorkingHours } from '@/server/settings'
import { toPersianDigits } from '@/lib/utils'

export const metadata: Metadata = { title: 'ساعات کاری' }
export const dynamic = 'force-dynamic'

export default async function HoursPage() {
  const hours = await getWorkingHours()

  return (
    <>
      <PageHeader
        title="ساعات کاری"
        description={`برای هر روز هفته می‌توانید یک یا چند بازه تعریف کنید. ساعت را با چهار رقم پشت سر هم بنویسید — مثلاً ${toPersianDigits('0823')} برای ${toPersianDigits('08:23')}. نوبت‌ها فقط در رأس ساعت و با فاصله ${toPersianDigits(SLOT_STEP_MINUTES)} دقیقه ساخته می‌شوند؛ برای نمایش ${toPersianDigits('16:00')}، بازه را از همان ساعت یا زودتر شروع کنید.`}
      />
      <HoursEditor hours={hours} />
    </>
  )
}
