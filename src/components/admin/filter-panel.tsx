'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition, type ReactNode } from 'react'
import { cn, toPersianDigits } from '@/lib/utils'

export type FilterTab = { id: string; label: string; count?: number; href: string }

/**
 * A filtered list with its own tabs and progress bar.
 *
 * Same reason as the appointments panel: switching tab is a server round trip,
 * and without somewhere to show progress the page sits looking unchanged long
 * enough that the admin taps again. Owning the list means the bar can be drawn
 * over the results it is about to replace.
 *
 * Shared by the test orders and the testimonial queue.
 */
export function FilterPanel({
  tabs,
  activeTab,
  title,
  description,
  children,
}: {
  tabs: FilterTab[]
  activeTab: string
  title: string
  description?: string
  children: ReactNode
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <section className="bg-sand-100 relative rounded-[var(--radius-card)]">
      {/* Not `overflow-hidden` on the section: that would clip a row's overflow
          menu, which is absolutely positioned. The bar carries its own clip so
          the corner still rounds. */}
      <div
        aria-hidden={!pending}
        className={cn(
          'absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-[var(--radius-card)] bg-olive-100 transition-opacity duration-200',
          pending ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="animate-indeterminate h-full w-full bg-olive-700" />
      </div>

      <div className="p-6 lg:p-7">
        <h2 className="text-ink-900 text-[0.9375rem] font-bold">{title}</h2>
        {description ? (
          <p className="text-ink-400 mt-2 text-[0.8125rem] leading-[1.9]">
            {description}
          </p>
        ) : null}

        <nav aria-label="فیلترها" className="mt-5 mb-5">
          <ul className="flex flex-wrap gap-1.5">
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
                      startTransition(() => router.push(tab.href))
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[0.75rem] whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-olive-700 font-medium text-white'
                        : 'text-ink-500 hover:bg-sand-200 bg-white',
                      // Dimmed while a navigation is in flight, so a second
                      // tap is visibly pointless rather than silently ignored.
                      pending && !isActive && 'opacity-60'
                    )}
                  >
                    {tab.label}
                    {tab.count ? (
                      <span
                        className={cn(
                          'tabular-nums',
                          isActive ? 'text-white/70' : 'text-ink-400'
                        )}
                      >
                        ({toPersianDigits(tab.count)})
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className={cn('transition-opacity duration-200', pending && 'opacity-50')}>
          {children}
        </div>
      </div>
    </section>
  )
}
