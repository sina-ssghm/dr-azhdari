import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { SectionHeading } from '@/components/ui/section-heading'
import { ArrowDownIcon, ClockIcon, LockIcon } from '@/components/icons'
import { IntroPlayer } from '@/components/sections/intro-player'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { TESTS } from '@/content/tests'
import { testsPage } from '@/content/tests-page'
import { getTestPrices } from '@/server/tests'
import { formatPrice, toPersianDigits } from '@/lib/utils'

export const metadata: Metadata = {
  title: testsPage.meta.title,
  description: testsPage.meta.description,
}

export const dynamic = 'force-dynamic'

export default async function TestsPage() {
  const prices = await getTestPrices()
  const priced = new Map(prices.map((price) => [price.testId, price]))
  const available = TESTS.filter((test) => priced.get(test.id)?.enabled !== false)
  const copy = testsPage.index

  return (
    <section className="bg-sand-50 pt-32 pb-20 lg:pt-40 lg:pb-28">
      <Container>
        <SectionHeading title={copy.title} />
        <p className="text-ink-500 mx-auto mt-5 max-w-2xl text-center text-[0.9375rem] leading-[2]">
          {copy.lead}
        </p>

        {/* Between the page's own lead and the list of tests: someone who has
            never taken one needs to know what it is for before a grid of five
            of them is any use. The video sits at the inline end, matching the
            homepage's bands. */}
        <Reveal>
          <div className="bg-sand-100 mt-12 grid items-center gap-7 rounded-[var(--radius-band)] p-5 sm:p-6 lg:mt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:p-7">
            <div className="order-last lg:order-first">
              <IntroPlayer
                src={copy.intro.video.src}
                poster={copy.intro.video.poster}
                label={copy.intro.video.label}
                play={copy.intro.video.play}
              />
            </div>

            <div className="lg:pe-2">
              <h2 className="font-display text-ink-900 text-[1.25rem] font-bold lg:text-[1.375rem]">
                {copy.intro.title}
              </h2>

              <p className="text-ink-500 mt-4 text-justify text-[0.9375rem] leading-[2.1]">
                {copy.intro.body}
              </p>

              {/* A fragment, not a route: it moves down this page. `scroll-mt`
                  on the target clears the floating header, which would
                  otherwise land on the first row of cards. */}
              <Button
                href="#test-list"
                size="lg"
                className="mt-7"
                icon={<ArrowDownIcon className="size-full" strokeWidth={1.6} />}
              >
                {copy.intro.cta}
              </Button>
            </div>
          </div>
        </Reveal>

        {available.length === 0 ? (
          <p className="text-ink-400 mt-14 text-center text-[0.875rem]">{copy.empty}</p>
        ) : (
          <ul
            id="test-list"
            className="mt-12 grid scroll-mt-28 gap-4 lg:mt-14 lg:grid-cols-2"
          >
            {available.map((test) => {
              const price = priced.get(test.id)

              return (
                <li key={test.id}>
                  <Link
                    href={`/tests/${test.id}`}
                    className="group border-line flex h-full flex-col rounded-[var(--radius-card)] border bg-white p-6 transition-colors hover:border-olive-400 lg:p-7"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-ink-900 text-[1.0625rem] font-bold group-hover:text-olive-700">
                        {test.short}
                      </h2>
                      <span className="shrink-0 rounded-full bg-olive-50 px-3 py-1 text-[0.75rem] font-medium text-olive-800">
                        {/* The toman tariff: what most visitors will pay.
                            The USDT one appears once they say they are
                            abroad. Zero reads as «رایگان». */}
                        {formatPrice(price?.priceIrt ?? 0, 'IRT')}
                      </span>
                    </div>

                    <p className="text-ink-500 mt-3 flex-1 text-[0.8125rem] leading-[2]">
                      {test.blurb}
                    </p>

                    <div className="text-ink-400 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.75rem]">
                      <span>
                        {toPersianDigits(test.questions.length)} {copy.questions}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <ClockIcon className="size-[0.9rem]" />
                        {toPersianDigits(test.minutes)} {copy.minutes}
                      </span>
                      {!test.disclosesResult ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-800">
                          <LockIcon className="size-[0.9rem]" />
                          {copy.private}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Container>
    </section>
  )
}
