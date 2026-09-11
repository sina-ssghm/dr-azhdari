import type { Metadata } from 'next'
import { AppointmentsPanel, type Tab } from './appointments-panel'
import { NewAppointmentButton } from './new-appointment-button'
import { Pagination } from './pagination'
import { RowActions } from './row-actions'
import { Badge, EmptyState, PageHeader } from '@/components/admin/ui'
import {
  countAppointmentsByGroup,
  isStatusGroup,
  listAppointments,
  listAwaitingPayment,
  type AppointmentStatus,
  type StatusGroup,
} from '@/server/appointments'
import { BOOKABLE_SERVICES, serviceTitle } from '@/server/settings'
import { describeDate } from '@/lib/jalali'
import { formatAmount, toLatinDigits, toPersianDigits } from '@/lib/utils'

export const metadata: Metadata = { title: 'نوبت‌ها' }
export const dynamic = 'force-dynamic'

const statusLabel: Record<AppointmentStatus, string> = {
  pending: 'در انتظار',
  confirmed: 'رزرو شده',
  cancelled: 'لغو شده',
  completed: 'انجام شده',
}

const statusTone = {
  pending: 'amber',
  confirmed: 'green',
  cancelled: 'red',
  completed: 'neutral',
} as const

const paymentLabel: Record<string, string> = {
  unpaid: 'پرداخت‌نشده',
  pending_review: 'در انتظار بررسی رسید',
  paid: 'پرداخت‌شده',
  waived: 'بدون پرداخت',
}

const emptyLabel: Record<string, string> = {
  all: 'هنوز نوبتی ثبت نشده است.',
  pending: 'نوبتی در انتظار تأیید وجود ندارد.',
  reserved: 'نوبت رزروشده‌ای وجود ندارد.',
  done: 'هنوز نوبتی به‌عنوان انجام‌شده ثبت نشده است.',
  cancelled: 'نوبت لغوشده‌ای وجود ندارد.',
}

const TAB_LABELS: { id: StatusGroup; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'pending', label: 'در انتظار' },
  { id: 'reserved', label: 'رزرو شده' },
  { id: 'done', label: 'انجام شده' },
  { id: 'cancelled', label: 'لغو شده' },
]

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    q?: string
    from?: string
    to?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const group = isStatusGroup(params.status) ? params.status : 'all'
  // Persian digits are normalised so «۰۹۱۲» matches a phone stored as "0912".
  const search = params.q?.trim() ? toLatinDigits(params.q.trim()) : undefined
  const from = params.from && ISO_DATE.test(params.from) ? params.from : undefined
  const to = params.to && ISO_DATE.test(params.to) ? params.to : undefined
  const requestedPage = Number(params.page)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

  const [result, counts, awaiting] = await Promise.all([
    listAppointments({ group, search, from, to }, page),
    countAppointmentsByGroup({ search, from, to }),
    // Deliberately outside the filters: this is a to-do list, and it should
    // not empty out because the admin happened to be searching for a name.
    listAwaitingPayment(),
  ])

  /** Rebuilds the query string, overriding only what changed. */
  const buildHref = (next: { group?: StatusGroup; page?: number }) => {
    const qs = new URLSearchParams()
    const nextGroup = next.group ?? group
    if (nextGroup !== 'all') qs.set('status', nextGroup)
    if (params.q?.trim()) qs.set('q', params.q.trim())
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    if (next.page && next.page > 1) qs.set('page', String(next.page))
    const query = qs.toString()
    return `/admin/appointments${query ? `?${query}` : ''}`
  }

  const tabs: Tab[] = TAB_LABELS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count: counts[tab.id],
    href: buildHref({ group: tab.id }),
  }))

  const filtered = Boolean(search || from || to)

  return (
    <>
      <PageHeader
        title="نوبت‌ها"
        description="فهرست همه رزروها و ثبت نوبت جدید بدون نیاز به پرداخت."
        action={<NewAppointmentButton services={BOOKABLE_SERVICES} />}
      />

      {awaiting.length > 0 ? (
        <section className="mb-4 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-5 lg:p-6">
          <h2 className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-bold text-amber-900">
            رسیدهای در انتظار بررسی
            <Badge tone="amber">{toPersianDigits(awaiting.length)}</Badge>
          </h2>
          <p className="mt-2 text-[0.8125rem] leading-[1.9] text-amber-900/75">
            این رزروها رسید پرداخت فرستاده‌اند و منتظر تأیید شما هستند.
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {awaiting.map((item) => {
              const when = describeDate(new Date(`${item.scheduledOn}T12:00:00Z`))
              return (
                <li
                  key={item.bookingRef}
                  className="flex flex-col gap-2.5 rounded-xl border border-amber-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-ink-900 text-[0.8125rem] font-bold">
                      {item.fullName}
                    </span>
                    <p className="text-ink-400 mt-1 text-[0.6875rem] leading-relaxed">
                      {serviceTitle(item.serviceId)}
                      {' · '}
                      {toPersianDigits(`${when.weekday} ${when.full}`)}
                      {' · '}
                      <span dir="ltr" className="tabular-nums">
                        {toPersianDigits(item.scheduledAt)}
                      </span>
                      {' · '}
                      <span dir="ltr">{toPersianDigits(item.phone)}</span>
                      {item.amount !== null
                        ? ` · ${formatAmount(item.amount, item.currency ?? 'IRT')}`
                        : ''}
                    </p>
                  </div>

                  <RowActions appointment={item} services={BOOKABLE_SERVICES} />
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <AppointmentsPanel
        tabs={tabs}
        activeTab={group}
        total={result.total}
        status={group}
        search={params.q}
        from={from}
        to={to}
      >
        {result.rows.length === 0 ? (
          <EmptyState>
            {filtered ? 'نوبتی با این فیلترها پیدا نشد.' : emptyLabel[group]}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {result.rows.map((item) => {
              const when = describeDate(new Date(`${item.scheduledOn}T12:00:00Z`))
              return (
                <li
                  key={item.id}
                  // Stacked on mobile so the details always read before the
                  // actions; side by side once there is room.
                  className="border-line flex flex-col gap-2.5 rounded-xl border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-ink-900 text-[0.8125rem] font-bold">
                        {item.fullName}
                      </span>
                      {/* Pushed to the far edge on mobile, where the name and
                          badges share a narrow line; back beside the name once
                          there is room for both. */}
                      <div className="ms-auto flex flex-wrap items-center gap-2 sm:ms-0">
                        <Badge tone={statusTone[item.status]}>
                          {statusLabel[item.status]}
                        </Badge>
                        {/* The payment state is what the admin acts on, so it
                            gets a badge rather than a word in the muted line —
                            rejecting a receipt otherwise looked like nothing
                            had happened. */}
                        {item.paymentStatus === 'pending_review' ? (
                          <Badge tone="amber">رسید بررسی‌نشده</Badge>
                        ) : null}
                        {item.createdBy === 'admin' ? <Badge>ثبت مدیر</Badge> : null}
                      </div>
                    </div>

                    {/* Everything else on one muted line — three stacked lines
                        per row made the list far taller than it needed to be. */}
                    <p className="text-ink-400 mt-1 text-[0.6875rem] leading-relaxed">
                      {serviceTitle(item.serviceId)}
                      {' · '}
                      {toPersianDigits(`${when.weekday} ${when.full}`)}
                      {' · '}
                      <span dir="ltr" className="tabular-nums">
                        {toPersianDigits(item.scheduledAt)}
                      </span>
                      {' · '}
                      <span dir="ltr">{toPersianDigits(item.phone)}</span>
                      {' · '}
                      {paymentLabel[item.paymentStatus] ?? item.paymentStatus}
                      {item.amount !== null
                        ? ` · ${formatAmount(item.amount, item.currency ?? 'IRT')}`
                        : ''}
                      {item.discountCode ? ` · کد: ${item.discountCode}` : ''}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </p>
                  </div>

                  <div className="border-line -mx-1 border-t pt-2 sm:mx-0 sm:border-0 sm:pt-0">
                    <RowActions appointment={item} services={BOOKABLE_SERVICES} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {result.rows.length > 0 ? (
          <div className="border-line mt-4 border-t pt-4">
            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              hrefFor={(next) => buildHref({ page: next })}
            />
          </div>
        ) : null}
      </AppointmentsPanel>
    </>
  )
}
