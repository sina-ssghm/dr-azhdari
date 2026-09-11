'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type ReactNode } from 'react'
import { Modal } from '@/components/admin/modal'
import { inputClass } from '@/components/admin/ui'
import { FilterIcon, SpinnerIcon } from '@/components/icons'
import { JalaliDateField } from '@/components/ui/jalali-date-field'
import { cn, toPersianDigits } from '@/lib/utils'

const toIso = (date: Date) => date.toISOString().slice(0, 10)
const fromIso = (iso?: string) => (iso ? new Date(`${iso}T12:00:00Z`) : null)

export type Tab = { id: string; label: string; count: number; href: string }

/**
 * Owns the toolbar *and* the list, so a filter change can show progress over
 * the results it is about to replace.
 *
 * The tabs stay real <Link>s — middle-click and "open in new tab" keep
 * working — but their click is intercepted so the navigation runs inside a
 * transition this component can observe.
 */
export function AppointmentsPanel({
  tabs,
  activeTab,
  total,
  status,
  search,
  from,
  to,
  children,
}: {
  tabs: Tab[]
  activeTab: string
  total: number
  status: string
  search?: string
  from?: string
  to?: string
  children: ReactNode
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)

  const [query, setQuery] = useState(search ?? '')
  const [fromDate, setFromDate] = useState<Date | null>(fromIso(from))
  const [toDate, setToDate] = useState<Date | null>(fromIso(to))

  const go = (href: string) => {
    setSheetOpen(false)
    startTransition(() => router.push(href))
  }

  const applyFilters = (next: { from?: Date | null; to?: Date | null } = {}) => {
    const params = new URLSearchParams()
    // Status is kept; page is not — a new filter starts from the first page.
    if (status !== 'all') params.set('status', status)

    const q = query.trim()
    if (q) params.set('q', q)

    const start = next.from !== undefined ? next.from : fromDate
    const end = next.to !== undefined ? next.to : toDate
    if (start) params.set('from', toIso(start))
    if (end) params.set('to', toIso(end))

    const qs = params.toString()
    go(`/admin/appointments${qs ? `?${qs}` : ''}`)
  }

  const reset = () => {
    setQuery('')
    setFromDate(null)
    setToDate(null)
    go('/admin/appointments')
  }

  const activeCount = [query.trim() !== '', fromDate !== null, toDate !== null].filter(
    Boolean
  ).length

  /**
   * One definition of the fields, rendered inline on desktop and inside the
   * modal on mobile — the two must never drift apart.
   */
  const fields = (
    <>
      <label htmlFor="appointment-search" className="sr-only">
        جستجوی نام یا شماره تماس
      </label>
      <input
        id="appointment-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="جستجوی نام یا شماره تماس…"
        className={cn(inputClass, 'py-2 sm:w-56')}
      />

      <JalaliDateField
        value={fromDate}
        onChange={(date) => {
          setFromDate(date)
          applyFilters({ from: date })
        }}
        placeholder="از تاریخ"
        className="sm:w-44"
      />
      <JalaliDateField
        value={toDate}
        onChange={(date) => {
          setToDate(date)
          applyFilters({ to: date })
        }}
        placeholder="تا تاریخ"
        className="sm:w-44"
      />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-olive-700 px-5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-olive-800 disabled:opacity-60"
      >
        {pending ? <SpinnerIcon className="size-3.5 animate-spin" /> : null}
        جستجو
      </button>

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={reset}
          className="text-ink-500 hover:bg-sand-200 h-10 rounded-full px-4 text-[0.8125rem] transition-colors"
        >
          پاک کردن
        </button>
      ) : null}
    </>
  )

  return (
    <section className="bg-sand-100 relative rounded-[var(--radius-card)]">
      {/* Deliberately not `overflow-hidden`: that would clip a row's overflow
          menu, which is absolutely positioned and can extend past the card's
          edge. The progress bar carries its own clip so the corner still
          rounds. */}
      <div
        aria-hidden={!pending}
        className={cn(
          'absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-[var(--radius-card)] bg-olive-100 transition-opacity duration-200',
          pending ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="animate-indeterminate h-full w-full bg-olive-700" />
      </div>

      <div className="p-4 lg:p-6">
        {/* Toolbar — tabs at the inline start, filter trigger and count at the end. */}
        <div className="flex items-center justify-between gap-3">
          <nav
            aria-label="فیلتر نوبت‌ها"
            className="-mx-1 min-w-0 scrollbar-none overflow-x-auto px-1"
          >
            <ul className="bg-sand-200/70 inline-flex gap-1 rounded-full p-1">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTab
                return (
                  <li key={tab.id}>
                    <Link
                      href={tab.href}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={(event) => {
                        // Leave modified clicks to the browser.
                        if (event.metaKey || event.ctrlKey || event.shiftKey) return
                        event.preventDefault()
                        go(tab.href)
                      }}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.8125rem] whitespace-nowrap transition-colors',
                        isActive
                          ? 'bg-olive-700 font-semibold text-white'
                          : 'text-ink-500 hover:bg-sand-200 hover:text-ink-900'
                      )}
                    >
                      {tab.label}
                      <span
                        className={cn(
                          'text-[0.6875rem]',
                          isActive ? 'text-white/70' : 'text-ink-400'
                        )}
                      >
                        {toPersianDigits(tab.count)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Mobile: the four filter controls collapse behind one button. */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="جستجو و فیلتر"
            className="border-line text-ink-700 relative grid size-10 shrink-0 place-items-center rounded-full border bg-white transition-colors hover:border-olive-400 sm:hidden"
          >
            <FilterIcon className="size-[1.1rem]" />
            {activeCount > 0 ? (
              <span className="absolute -end-1 -top-1 grid size-4 place-items-center rounded-full bg-olive-700 text-[0.5625rem] text-white">
                {toPersianDigits(activeCount)}
              </span>
            ) : null}
          </button>

          <p className="text-ink-400 hidden shrink-0 text-[0.75rem] sm:block">
            {toPersianDigits(total)} نوبت
          </p>
        </div>

        {/* Desktop: the same fields, laid out inline. */}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            applyFilters()
          }}
          className="mt-3 hidden flex-wrap items-center gap-2 sm:flex"
        >
          {fields}
        </form>

        {/* Results — dimmed while the next page is on its way. */}
        <div
          aria-busy={pending}
          className={cn(
            'mt-3 transition-opacity duration-200 sm:mt-4',
            pending && 'pointer-events-none opacity-45'
          )}
        >
          {children}
        </div>
      </div>

      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="جستجو و فیلتر"
        description="بر اساس نام، شماره تماس یا بازه تاریخ فیلتر کنید."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            applyFilters()
          }}
          className="flex flex-col gap-3"
        >
          {fields}
        </form>
      </Modal>
    </section>
  )
}
