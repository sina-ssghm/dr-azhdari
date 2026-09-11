import Link from 'next/link'
import { ArrowLeftIcon, CheckIcon } from '@/components/icons'
import type { PsyTest } from '@/content/tests'
import { testsPage } from '@/content/tests-page'
import type { TestResult } from '@/lib/test-scoring'
import { cn, toPersianDigits } from '@/lib/utils'

/**
 * One scale as a labelled bar.
 *
 * A bar rather than a number alone because these scores mean nothing without
 * their ceiling — 22 is unremarkable out of 48 and severe out of 30.
 */
function ScaleBar({
  title,
  score,
  max,
  ratio,
  level,
  flagged,
}: {
  title: string
  score: number
  max: number
  ratio: number
  level?: string
  flagged?: boolean
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            'text-[0.8125rem]',
            flagged ? 'font-bold text-amber-900' : 'text-ink-700 font-medium'
          )}
        >
          {title}
        </span>
        <span className="text-ink-400 shrink-0 text-[0.75rem] tabular-nums">
          {toPersianDigits(score)} {testsPage.result.outOf} {toPersianDigits(max)}
        </span>
      </div>

      <div className="bg-sand-200 mt-2 h-2.5 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full', flagged ? 'bg-amber-500' : 'bg-olive-700')}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>

      {level ? (
        <p
          className={cn(
            'mt-1.5 text-[0.75rem]',
            flagged ? 'text-amber-900' : 'text-ink-400'
          )}
        >
          {level}
        </p>
      ) : null}
    </li>
  )
}

export function TestResultView({
  test,
  result,
  fullName,
  completedAt,
}: {
  test: PsyTest
  result: TestResult
  fullName: string
  completedAt: string | null
}) {
  const copy = testsPage.result

  // Young's fifteen schemas group into domains; the others are a flat list.
  const domains = [...new Set(result.scales.map((scale) => scale.domain))].filter(
    (domain): domain is string => Boolean(domain)
  )

  return (
    <div className="mx-auto max-w-2xl">
      <div className="bg-sand-100 rounded-[var(--radius-card)] p-6 text-center lg:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-olive-700 text-white">
          <CheckIcon className="size-6" />
        </span>
        <h1 className="text-ink-900 mt-5 text-[1.25rem] font-bold">
          {test.disclosesResult ? copy.title : copy.submitted}
        </h1>
        <p className="text-ink-400 mt-2 text-[0.8125rem]">
          {copy.for} {fullName}
          {completedAt ? (
            <>
              {' · '}
              {toPersianDigits(
                new Intl.DateTimeFormat('fa-IR', {
                  dateStyle: 'long',
                }).format(new Date(completedAt))
              )}
            </>
          ) : null}
        </p>
      </div>

      {/* A positive answer on a self-harm item outranks everything else on
          the page, so it sits above the scores rather than under them. */}
      {result.safety ? (
        <div className="mt-4 rounded-[var(--radius-card)] border-2 border-red-300 bg-red-50 p-6">
          <p className="font-bold text-red-900">{copy.safety}</p>
          <p className="mt-2 text-[0.875rem] leading-[2.1] text-red-900/90">
            {result.safety}
          </p>
        </div>
      ) : null}

      {!test.disclosesResult ? (
        <p className="mt-4 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 px-6 py-6 text-[0.875rem] leading-[2.1] text-amber-900">
          {test.privateNotice}
        </p>
      ) : (
        <>
          {test.totalBands ? (
            <div className="mt-4 rounded-[var(--radius-card)] bg-white p-6 lg:p-7">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-400 text-[0.8125rem]">{copy.total}</span>
                <span className="text-ink-900 text-[1.5rem] font-bold tabular-nums">
                  {toPersianDigits(result.total)}
                  <span className="text-ink-400 text-[0.875rem] font-normal">
                    {' '}
                    {copy.outOf} {toPersianDigits(result.totalMax)}
                  </span>
                </span>
              </div>
              {result.level ? (
                <p className="mt-4 text-[1rem] font-bold text-olive-700">
                  {result.level}
                </p>
              ) : null}
              {result.message ? (
                <p className="text-ink-500 mt-2 text-[0.875rem] leading-[2.1]">
                  {result.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {test.resultIntro ? (
            <p className="text-ink-500 mt-4 rounded-[var(--radius-card)] bg-white px-6 py-5 text-[0.8125rem] leading-[2.1]">
              {test.resultIntro}
            </p>
          ) : null}

          {result.scales.length > 0 ? (
            <div className="mt-4 rounded-[var(--radius-card)] bg-white p-6 lg:p-7">
              <h2 className="text-ink-900 text-[0.9375rem] font-bold">{copy.scales}</h2>

              {domains.length > 0 ? (
                <div className="mt-5 flex flex-col gap-7">
                  {domains.map((domain) => (
                    <section key={domain}>
                      <h3 className="text-ink-400 border-line mb-4 border-b pb-2 text-[0.75rem] font-medium">
                        {domain}
                      </h3>
                      <ul className="flex flex-col gap-5">
                        {result.scales
                          .filter((scale) => scale.domain === domain)
                          .map((scale) => (
                            <ScaleBar {...scale} key={scale.key} />
                          ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : (
                <ul className="mt-5 flex flex-col gap-5">
                  {result.scales.map((scale) => (
                    <ScaleBar {...scale} key={scale.key} />
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}

      <div className="mt-4 rounded-[var(--radius-card)] bg-olive-700 p-6 text-center lg:p-7">
        <p className="text-[0.875rem] leading-[2.1] text-white/90">{test.cta}</p>
        <Link
          href="/booking"
          className="hover:bg-sand-100 mt-5 inline-flex h-[3.25rem] items-center rounded-full bg-white px-7 text-sm font-medium text-olive-800 transition-colors"
        >
          {copy.book}
        </Link>
      </div>

      {/* This page is reached by a private link and carries no site header, so
          without this there is no way out of it but the back button. Kept
          quiet so it does not compete with the booking call to action. */}
      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-ink-500 hover:bg-sand-100 hover:text-ink-900 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.8125rem] transition-colors"
        >
          <ArrowLeftIcon className="size-4 rotate-180" strokeWidth={1.6} />
          {copy.home}
        </Link>
      </div>
    </div>
  )
}
