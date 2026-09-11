import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequestForm } from './request-form'
import { Container } from '@/components/ui/container'
import { ClockIcon, LockIcon } from '@/components/icons'
import { findTest, TESTS } from '@/content/tests'
import { testsPage } from '@/content/tests-page'
import { getTestPrices } from '@/server/tests'
import { toPersianDigits } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const test = findTest((await params).id)
  return test
    ? { title: test.title, description: test.blurb }
    : { title: testsPage.meta.title }
}

export function generateStaticParams() {
  return TESTS.map((test) => ({ id: test.id }))
}

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const test = findTest(id)
  if (!test) notFound()

  const price = (await getTestPrices()).find((row) => row.testId === id)
  const enabled = price?.enabled !== false
  const free = !price || (price.priceIrt <= 0 && price.priceUsdt <= 0)
  const copy = testsPage.detail

  return (
    <section className="bg-sand-50 pt-32 pb-20 lg:pt-40 lg:pb-28">
      <Container>
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-[1.75rem] font-bold text-olive-700 lg:text-[2.125rem]">
            {test.title}
          </h1>
          <div className="text-ink-400 mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.8125rem]">
            <span>
              {toPersianDigits(test.questions.length)} {testsPage.index.questions}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-[0.95rem]" />
              {toPersianDigits(test.minutes)} {testsPage.index.minutes}
            </span>
          </div>
        </header>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 lg:mt-12 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div className="flex flex-col gap-4">
            <div className="bg-sand-100 rounded-[var(--radius-card)] p-6 lg:p-7">
              <h2 className="text-ink-900 text-[0.9375rem] font-bold">{copy.about}</h2>
              <p className="text-ink-500 mt-3 text-[0.875rem] leading-[2.1]">
                {test.blurb}
              </p>
            </div>

            <div className="bg-sand-100 rounded-[var(--radius-card)] p-6 lg:p-7">
              <h2 className="text-ink-900 text-[0.9375rem] font-bold">{copy.howTitle}</h2>
              <ol className="mt-4 flex flex-col gap-3">
                {(free ? copy.howFree : copy.how).map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-olive-700 text-[0.75rem] font-bold text-white">
                      {toPersianDigits(index + 1)}
                    </span>
                    <span className="text-ink-500 text-[0.8125rem] leading-[1.95]">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-[0.75rem] leading-[1.95] text-amber-900">
                <LockIcon className="mt-0.5 size-[0.95rem] shrink-0" />
                {copy.linkNotice}
              </p>
            </div>

            {!test.disclosesResult ? (
              <p className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 px-6 py-5 text-[0.8125rem] leading-[2] text-amber-900">
                {test.privateNotice}
              </p>
            ) : null}
          </div>

          <div className="bg-sand-100 rounded-[var(--radius-card)] p-6 lg:sticky lg:top-28 lg:p-7">
            <h2 className="text-ink-900 mb-5 text-[0.9375rem] font-bold">
              {copy.formTitle}
            </h2>
            {enabled ? (
              <RequestForm
                testId={test.id}
                priceIrt={price?.priceIrt ?? 0}
                priceUsdt={price?.priceUsdt ?? 0}
              />
            ) : (
              <p className="text-ink-400 text-[0.8125rem] leading-[2]">{copy.disabled}</p>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
