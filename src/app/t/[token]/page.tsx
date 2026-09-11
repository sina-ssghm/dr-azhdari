import type { Metadata } from 'next'
import Link from 'next/link'
import { TestResultView } from './test-result'
import { TestRunner } from './test-runner'
import { Container } from '@/components/ui/container'
import { findTest } from '@/content/tests'
import { testsPage } from '@/content/tests-page'
import { scoreTest } from '@/lib/test-scoring'
import { getOrderByToken } from '@/server/tests'

export const metadata: Metadata = {
  title: 'آزمون آنلاین',
  // A private link. Nothing here should ever reach a search index.
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

/**
 * The whole of a test, behind one link.
 *
 * There are no accounts on this site, so the token in the URL is the identity,
 * the authorisation and the session all at once. It is issued only when the
 * payment is approved, and once the test has been submitted this page stops
 * being a questionnaire and becomes a result — which is what makes the link
 * safe to send over a messenger and impossible to reuse.
 */
export default async function TestPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const order = await getOrderByToken(token).catch(() => null)
  const test = order ? findTest(order.testId) : undefined

  const shell = (children: React.ReactNode) => (
    <section className="bg-sand-50 pt-32 pb-20 lg:pt-36 lg:pb-28">
      <Container>{children}</Container>
    </section>
  )

  // Covers a mistyped link, a revoked one, and an order whose payment was
  // refused after the link had already gone out.
  if (!order || !test || order.paymentStatus !== 'paid') {
    return shell(
      <div className="bg-sand-100 mx-auto max-w-lg rounded-[var(--radius-card)] p-8 text-center">
        <h1 className="text-ink-900 text-[1.125rem] font-bold">{testsPage.gone.title}</h1>
        <p className="text-ink-500 mt-3 text-[0.875rem] leading-[2.1]">
          {testsPage.gone.body}
        </p>
        {/* Same reason as on the result: no site header on these pages, so a
            dead end is a genuine dead end without a way back. */}
        <Link
          href="/"
          className="mt-6 inline-flex h-[3rem] items-center rounded-full bg-olive-700 px-7 text-sm font-medium text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800"
        >
          {testsPage.result.home}
        </Link>
      </div>
    )
  }

  if (order.completedAt) {
    // Recomputed only as a fallback: the stored result is authoritative, so a
    // later revision of an instrument cannot restate somebody's old outcome.
    const result = order.result ?? scoreTest(test, order.answers)
    return shell(
      <TestResultView
        test={test}
        result={result}
        fullName={order.fullName}
        completedAt={order.completedAt}
      />
    )
  }

  return shell(
    <>
      <header className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="font-display text-[1.5rem] font-bold text-olive-700 lg:text-[1.875rem]">
          {test.title}
        </h1>
        <p className="text-ink-400 mt-3 text-[0.8125rem] leading-[1.95]">
          {testsPage.run.introBody}
        </p>
      </header>

      <TestRunner token={token} test={test} initialAnswers={order.answers} />
    </>
  )
}
