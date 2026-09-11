import type { Metadata } from 'next'
import { SettingsForm } from './settings-form'
import { PageHeader } from '@/components/admin/ui'
import { getSettings } from '@/server/settings'

export const metadata: Metadata = { title: 'تنظیمات' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <>
      <PageHeader
        title="تنظیمات"
        description="اطلاعات پرداختی که پس از ثبت رزرو به مراجع نمایش داده می‌شود، و اطلاعات تماسی که در پاورقی سایت دیده می‌شود."
      />
      <SettingsForm settings={settings} />
    </>
  )
}
