/** Copy for the articles page — a list of papers to download. */
export const articlesPage = {
  meta: {
    title: 'مقالات',
    description:
      'مقاله‌ها و پژوهش‌های دکتر زهره اژدری در زمینه روان‌شناسی، طرحواره‌درمانی و روابط، برای دانلود.',
  },
  title: 'مقالات',
  lead: 'مقاله‌ها و پژوهش‌ها، به‌صورت فایل PDF و قابل دانلود.',
  empty: 'هنوز مقاله‌ای منتشر نشده است.',
  download: 'دانلود مقاله',
  pageCount: (n: string) => `${n} صفحه`,
  readingTime: (n: string) => `حدود ${n} دقیقه مطالعه`,
  /** Reads better than a bare byte count next to a Persian sentence. */
  size: (mb: string) => `${mb} مگابایت`,
  pages: 'PDF',
} as const

/**
 * The languages a paper can be in, and the flag shown beside it.
 *
 * A flag for a language is a compromise — English is not the United Kingdom's
 * property — but it reads instantly next to the name, which is what the card
 * needs. The name is always written out, so the flag never carries the meaning
 * on its own.
 */
export const ARTICLE_LANGUAGES = {
  fa: { label: 'فارسی', country: 'IR' },
  en: { label: 'انگلیسی', country: 'GB' },
} as const

export type ArticleLanguage = keyof typeof ARTICLE_LANGUAGES

export function isArticleLanguage(value: unknown): value is ArticleLanguage {
  return value === 'fa' || value === 'en'
}

export const TITLE_MAX = 160
export const DESCRIPTION_MAX = 400
