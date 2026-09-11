import type { Metadata } from 'next'
import { TestOrderRow } from './order-row'
import { TestPricesForm } from './prices-form'
import { FilterPanel } from '@/components/admin/filter-panel'
import { EmptyState, PageHeader } from '@/components/admin/ui'
import { findTest } from '@/content/tests'
import { toPersianDigits } from '@/lib/utils'
import {
  getTestPrices,
  isOrderGroup,
  listTestOrders,
  type OrderGroup,
} from '@/server/tests'

export const metadata: Metadata = { title: 'آزمون‌ها' }
export const dynamic = 'force-dynamic'

const tabs: { id: OrderGroup; label: string }[] = [
  { id: 'awaiting', label: 'در انتظار بررسی' },
  { id: 'paid', label: 'تأیید شده' },
  { id: 'unpaid', label: 'پرداخت نشده' },
  { id: 'rejected', label: 'رد شده' },
  { id: 'all', label: 'همه' },
]

export default async function AdminTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const group: OrderGroup = isOrderGroup(tab) ? tab : 'awaiting'

  const [prices, orders, awaiting] = await Promise.all([
    getTestPrices(),
    listTestOrders(group),
    listTestOrders('awaiting'),
  ])

  return (
    <>
      <PageHeader
        title="آزمون‌ها"
        description="سفارش‌های ثبت‌شده و تعرفه آزمون‌های آنلاین. پس از تأیید پرداخت، لینک اختصاصی آزمون ساخته می‌شود؛ آن را از همین‌جا کپی کرده و برای مراجع بفرستید."
      />

      <div className="flex flex-col gap-4">
        <FilterPanel
          title="سفارش‌ها"
          description={
            awaiting.length > 0
              ? `${toPersianDigits(awaiting.length)} رسید در انتظار بررسی است.`
              : undefined
          }
          activeTab={group}
          tabs={tabs.map((item) => ({
            id: item.id,
            label: item.label,
            href: `/admin/tests?tab=${item.id}`,
            ...(item.id === 'awaiting' ? { count: awaiting.length } : {}),
          }))}
        >
          {orders.length === 0 ? (
            <EmptyState>سفارشی در این دسته وجود ندارد.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {orders.map((order) => (
                <TestOrderRow
                  key={order.orderRef}
                  order={order}
                  test={findTest(order.testId)}
                />
              ))}
            </ul>
          )}
        </FilterPanel>

        {/* Below the queue: the orders are the daily work, the tariffs are set
            once and then left alone. */}
        <TestPricesForm prices={prices} />
      </div>
    </>
  )
}
