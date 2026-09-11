import Link from 'next/link'
import { NotificationsButton } from '@/components/admin/notifications-button'
import { Badge, Card, EmptyState, PageHeader } from '@/components/admin/ui'
import { Icon } from '@/components/icons'
import { adminNav } from '@/content/admin'
import { listAwaitingPayment, listUpcomingAppointments } from '@/server/appointments'
import { notificationStatus } from '@/server/notifications'
import { serviceTitle } from '@/server/settings'
import { listTestOrders } from '@/server/tests'
import { listTestimonials } from '@/server/testimonials'
import { describeDate } from '@/lib/jalali'
import { toPersianDigits } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * A queue that is waiting on the admin rather than reporting to them.
 *
 * Receipts arrive from two places now — session bookings and online tests —
 * and both need the same decision, so they get the same banner rather than
 * one of them being easy to miss.
 */
function AwaitingReceipts({
  href,
  title,
  names,
  action,
}: {
  href: string
  title: string
  names: string[]
  action: string
}) {
  if (names.length === 0) return null

  return (
    <Link
      href={href}
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-5 transition-colors hover:bg-amber-100 lg:p-6"
    >
      <div>
        <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-bold text-amber-900">
          {title}
          <Badge tone="amber">{toPersianDigits(names.length)}</Badge>
        </p>
        <p className="mt-2 text-[0.8125rem] leading-[1.9] text-amber-900/75">
          {names.slice(0, 3).join('، ')}
          {names.length > 3 ? ` و ${toPersianDigits(names.length - 3)} مورد دیگر` : ''}
        </p>
      </div>
      <span className="text-[0.8125rem] font-medium text-amber-900 underline">
        {action}
      </span>
    </Link>
  )
}

export default async function AdminDashboard() {
  const [upcoming, awaiting, awaitingTests, pendingComments, notifications] =
    await Promise.all([
      listUpcomingAppointments(5),
      listAwaitingPayment(),
      listTestOrders('awaiting'),
      listTestimonials('pending'),
      notificationStatus(),
    ])

  return (
    <>
      <PageHeader
        title="داشبورد"
        description="نمای کلی وضعیت رزروها و تنظیمات."
        action={<NotificationsButton initial={notifications} />}
      />

      {/* At the top on purpose: these are the only things on the page that are
          waiting on the admin rather than reporting to them. */}
      <AwaitingReceipts
        href="/admin/appointments"
        title="رسیدهای نوبت در انتظار بررسی"
        names={awaiting.map((item) => item.fullName)}
        action="بررسی رسیدها"
      />

      <AwaitingReceipts
        href="/admin/tests?tab=awaiting"
        title="رسیدهای آزمون در انتظار بررسی"
        names={awaitingTests.map((order) => order.fullName)}
        action="بررسی و صدور لینک"
      />

      <AwaitingReceipts
        href="/admin/testimonials?tab=pending"
        title="نظرهای در انتظار بررسی"
        names={pendingComments.map((comment) => comment.name)}
        action="خواندن و تأیید"
      />

      <div>
        <Card
          title="نوبت‌های پیش‌رو"
          action={
            <Link
              href="/admin/appointments"
              className="hover:bg-sand-200 rounded-full px-3 py-1.5 text-[0.75rem] font-medium text-olive-700 transition-colors"
            >
              مشاهده همه نوبت‌ها
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState>نوبت پیش‌رویی ثبت نشده است.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((item) => {
                const when = describeDate(new Date(`${item.scheduledOn}T12:00:00Z`))
                return (
                  <li
                    key={item.id}
                    className="border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      {/* No status badge: every row here is confirmed, so it
                          would say the same thing on all of them. */}
                      <span className="text-ink-900 text-[0.8125rem] font-bold">
                        {item.fullName}
                      </span>
                      <p className="text-ink-400 mt-1 text-[0.6875rem]">
                        {serviceTitle(item.serviceId)}
                        {' · '}
                        <span dir="ltr">{toPersianDigits(item.phone)}</span>
                      </p>
                    </div>

                    <p className="text-ink-500 text-[0.75rem]">
                      {toPersianDigits(`${when.weekday} ${when.full}`)}
                      {' · '}
                      <span dir="ltr" className="tabular-nums">
                        {toPersianDigits(item.scheduledAt)}
                      </span>
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminNav
          .filter((item) => !item.exact)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-sand-100 hover:bg-sand-50 flex items-center gap-3 rounded-[var(--radius-card)] p-5 transition-colors"
            >
              <Icon
                name={item.icon}
                className="size-5 text-olive-700"
                strokeWidth={1.4}
              />
              <span className="text-ink-900 text-[0.875rem] font-medium">
                {item.label}
              </span>
            </Link>
          ))}
      </div>
    </>
  )
}
