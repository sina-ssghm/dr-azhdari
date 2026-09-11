import type { Metadata } from 'next'
import { DiscountsManager, NewDiscountButton } from './discounts-manager'
import { PageHeader } from '@/components/admin/ui'
import { listDiscounts } from '@/server/discounts'
import { BOOKABLE_SERVICES } from '@/server/settings'

export const metadata: Metadata = { title: 'کدهای تخفیف' }
export const dynamic = 'force-dynamic'

export default async function DiscountsPage() {
  const discounts = await listDiscounts()

  return (
    <>
      <PageHeader
        title="کدهای تخفیف"
        description="برای هر کد می‌توانید نوع، مقدار، تاریخ انقضا، تعداد دفعات مجاز و خدمات مشمول را تعیین کنید."
        action={<NewDiscountButton services={BOOKABLE_SERVICES} />}
      />
      <DiscountsManager services={BOOKABLE_SERVICES} discounts={discounts} />
    </>
  )
}
