import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { cn, toPersianDigits } from '@/lib/utils'

/**
 * Prev/next with a page indicator. Links rather than buttons, so paging works
 * without JavaScript and each page has its own URL.
 */
export function Pagination({
  page,
  pageCount,
  total,
  hrefFor,
}: {
  page: number
  pageCount: number
  total: number
  hrefFor: (page: number) => string
}) {
  if (pageCount <= 1) {
    return (
      <p className="text-ink-400 text-center text-[0.75rem]">
        {toPersianDigits(total)} نوبت
      </p>
    )
  }

  const step =
    'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[0.8125rem] transition-colors'

  return (
    <nav
      aria-label="صفحه‌بندی نوبت‌ها"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      {/* In RTL the "previous" control sits on the right and points right. */}
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className={cn(step, 'text-ink-700 hover:bg-sand-200')}
        >
          <ChevronRightIcon className="size-4" />
          قبلی
        </Link>
      ) : (
        <span className={cn(step, 'text-ink-400/60 cursor-default')}>
          <ChevronRightIcon className="size-4" />
          قبلی
        </span>
      )}

      <p className="text-ink-500 text-[0.75rem]">
        صفحه {toPersianDigits(page)} از {toPersianDigits(pageCount)}
        <span className="text-ink-400"> · {toPersianDigits(total)} نوبت</span>
      </p>

      {page < pageCount ? (
        <Link
          href={hrefFor(page + 1)}
          className={cn(step, 'text-ink-700 hover:bg-sand-200')}
        >
          بعدی
          <ChevronLeftIcon className="size-4" />
        </Link>
      ) : (
        <span className={cn(step, 'text-ink-400/60 cursor-default')}>
          بعدی
          <ChevronLeftIcon className="size-4" />
        </span>
      )}
    </nav>
  )
}
