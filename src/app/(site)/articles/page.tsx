import type { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { Flag } from '@/components/ui/flag'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeading } from '@/components/ui/section-heading'
import { DocumentIcon, DownloadIcon } from '@/components/icons'
import { ARTICLE_LANGUAGES, articlesPage } from '@/content/articles-page'
import { readingMinutes } from '@/lib/articles'
import { findCountry } from '@/lib/phone'
import { formatNumber, toPersianDigits } from '@/lib/utils'
import { listPublishedArticles, type Article } from '@/server/articles'

export const metadata: Metadata = {
  title: articlesPage.meta.title,
  description: articlesPage.meta.description,
}

// Read from the database, so it cannot be rendered when the image is built.
export const dynamic = 'force-dynamic'

/**
 * `513607` → «۰٫۵ مگابایت», so the size means something before the tap.
 *
 * Formatted through Intl rather than `toFixed`, which would leave an ASCII
 * full stop sitting between Persian numerals where «٫» belongs.
 */
const readableSize = (bytes: number) =>
  articlesPage.size(formatNumber(bytes / (1024 * 1024), 1))

/**
 * The facts about a file, as separate boxes rather than one sentence.
 *
 * As a single text node the Latin «PDF» and the Persian digits shared a bidi
 * paragraph and the browser reordered them into «۰٫۳ PDF مگابایت». Each fact
 * is its own flex item, laid out right-to-left by the container and resolved
 * independently.
 */
function Meta({ article }: { article: Article }) {
  const language = ARTICLE_LANGUAGES[article.language]

  return (
    <div className="text-ink-400 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem]">
      <span className="flex items-center gap-1.5">
        <Flag
          country={findCountry(language.country)}
          className="h-[0.65rem] w-[0.9rem]"
          decorative
        />
        {language.label}
      </span>

      <span aria-hidden="true">·</span>
      <span>{articlesPage.pages}</span>

      <span aria-hidden="true">·</span>
      <span>{readableSize(article.fileSize)}</span>

      {article.pageCount ? (
        <>
          <span aria-hidden="true">·</span>
          <span>{articlesPage.pageCount(toPersianDigits(article.pageCount))}</span>
          <span aria-hidden="true">·</span>
          <span>
            {articlesPage.readingTime(toPersianDigits(readingMinutes(article.pageCount)))}
          </span>
        </>
      ) : null}
    </div>
  )
}

export default async function ArticlesPage() {
  const articles = await listPublishedArticles().catch((error) => {
    console.error('[articles] could not be read', error)
    return []
  })

  return (
    <section className="bg-sand-50 pt-32 pb-20 lg:pt-40 lg:pb-28">
      <Container>
        <Reveal>
          <SectionHeading title={articlesPage.title} description={articlesPage.lead} />
        </Reveal>

        {articles.length === 0 ? (
          <p className="text-ink-400 mt-14 text-center text-[0.875rem]">
            {articlesPage.empty}
          </p>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
            {articles.map((article, i) => (
              <Reveal as="li" key={article.id} delay={i * 80} className="flex">
                <article className="border-line group flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border bg-white transition-colors hover:border-olive-400">
                  {/*
                    The whole cover is the download. The artwork already
                    carries the title, so repeating it underneath would say
                    the same thing twice — but the heading still exists for
                    screen readers and search, just not on screen.
                  */}
                  <a
                    href={`/api/articles/${article.id}`}
                    className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-400"
                  >
                    <h2 className="sr-only">{article.title}</h2>

                    {article.coverName ? (
                      // `contain`, not `cover`: these covers have the title set
                      // into the artwork, and cropping one to fit a fixed box
                      // would cut somebody's words in half. A plain <img>
                      // because the source is a route handler, not a static
                      // file the optimiser can reach.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/articles/${article.id}/cover`}
                        alt=""
                        loading={i < 4 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="bg-sand-100 aspect-[9/16] w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      // No cover: the title has to be visible, or the card is
                      // an anonymous grey box.
                      <div className="bg-sand-100 flex aspect-[9/16] w-full flex-col items-center justify-center gap-4 p-6 text-center">
                        <DocumentIcon
                          className="size-9 text-olive-700"
                          strokeWidth={1.3}
                        />
                        <p
                          dir="auto"
                          className="text-ink-900 text-[0.875rem] leading-[1.9] font-bold"
                        >
                          {article.title}
                        </p>
                      </div>
                    )}
                  </a>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    {article.description ? (
                      <p
                        dir="auto"
                        className="text-ink-500 text-[0.75rem] leading-[1.95]"
                      >
                        {article.description}
                      </p>
                    ) : null}

                    <Meta article={article} />

                    <a
                      href={`/api/articles/${article.id}`}
                      className="mt-auto inline-flex h-[2.75rem] items-center justify-center gap-2 rounded-full bg-olive-700 px-5 text-[0.8125rem] font-medium text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800"
                    >
                      <DownloadIcon className="size-4" />
                      {articlesPage.download}
                    </a>
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>
        )}
      </Container>
    </section>
  )
}
