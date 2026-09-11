import type { Metadata } from 'next'
import { TestimonialRow } from './testimonial-row'
import { FilterPanel } from '@/components/admin/filter-panel'
import { EmptyState, PageHeader } from '@/components/admin/ui'
import { toPersianDigits } from '@/lib/utils'
import {
  isTestimonialGroup,
  listTestimonials,
  countPendingTestimonials,
  type TestimonialGroup,
} from '@/server/testimonials'

export const metadata: Metadata = { title: 'نظرات مراجعان' }
export const dynamic = 'force-dynamic'

const tabs: { id: TestimonialGroup; label: string }[] = [
  { id: 'pending', label: 'در انتظار بررسی' },
  { id: 'approved', label: 'منتشر شده' },
  { id: 'rejected', label: 'رد شده' },
  { id: 'all', label: 'همه' },
]

export default async function AdminTestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const group: TestimonialGroup = isTestimonialGroup(tab) ? tab : 'pending'

  const [items, pending] = await Promise.all([
    listTestimonials(group),
    countPendingTestimonials(),
  ])

  return (
    <>
      <PageHeader
        title="نظرات مراجعان"
        description="نظرهایی که مراجعان از طریق سایت ثبت کرده‌اند. هیچ نظری تا زمانی که آن را تأیید نکنید روی سایت نمایش داده نمی‌شود؛ پیش از انتشار می‌توانید متن را ویرایش کنید."
      />

      <FilterPanel
        title="نظرها"
        description={
          pending > 0 ? `${toPersianDigits(pending)} نظر در انتظار بررسی است.` : undefined
        }
        activeTab={group}
        tabs={tabs.map((item) => ({
          id: item.id,
          label: item.label,
          href: `/admin/testimonials?tab=${item.id}`,
          ...(item.id === 'pending' ? { count: pending } : {}),
        }))}
      >
        {items.length === 0 ? (
          <EmptyState>نظری در این دسته وجود ندارد.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <TestimonialRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </FilterPanel>
    </>
  )
}
