import type { Metadata } from 'next'
import { PricesForm } from './prices-form'
import { PageHeader } from '@/components/admin/ui'
import { PRICE_TIERS, getDurationPrices } from '@/server/settings'

export const metadata: Metadata = { title: 'تعرفه‌ها' }
export const dynamic = 'force-dynamic'

export default async function PricesPage() {
  const prices = await getDurationPrices()

  return (
    <>
      <PageHeader
        title="تعرفه‌ها"
        description="تعرفه هر نوع مشاوره را به تفکیک مدت جلسه مشخص کنید: کارت به کارت داخل ایران (تومان)، کارت به کارت خارج از ایران (تومان) و پرداخت با تتر."
      />
      <PricesForm tiers={PRICE_TIERS} prices={prices} />
    </>
  )
}
