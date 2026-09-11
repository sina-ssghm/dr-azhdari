import 'server-only'

import type { ArticleLanguage } from '@/content/articles-page'
import { getPool } from '@/lib/db'
import { removeArticleFile } from '@/lib/articles'

/**
 * Published papers, offered as PDF downloads.
 *
 * No bodies and no cover images: the file is the article. What is stored here
 * is what the list needs to show — a title, a line of description, and enough
 * about the file to describe the download before somebody commits to it.
 */

export type Article = {
  id: number
  title: string
  description: string | null
  fileName: string
  originName: string
  fileSize: number
  language: ArticleLanguage
  /** Null when the PDF's page tree could not be read. */
  pageCount: number | null
  /** Portrait artwork carrying the title; null falls back to a text card. */
  coverName: string | null
  published: boolean
  position: number
  createdAt: string
}

type Row = {
  id: number
  title: string
  description: string | null
  file_name: string
  origin_name: string
  file_size: number
  language: ArticleLanguage
  page_count: number | null
  cover_name: string | null
  published: boolean
  position: number
  created_at: string
}

const columns = `id, title, description, file_name, origin_name, file_size, language,
   page_count, cover_name, published, position, created_at`

const toArticle = (row: Row): Article => ({
  id: row.id,
  title: row.title,
  description: row.description,
  fileName: row.file_name,
  originName: row.origin_name,
  fileSize: row.file_size,
  language: row.language,
  pageCount: row.page_count,
  coverName: row.cover_name,
  published: row.published,
  position: row.position,
  createdAt: row.created_at,
})

/** Ordered by `position` so the practice decides what leads the page. */
export async function listPublishedArticles(): Promise<Article[]> {
  const { rows } = await getPool().query<Row>(
    `select ${columns} from article where published order by position, id`
  )
  return rows.map(toArticle)
}

export async function listArticles(): Promise<Article[]> {
  const { rows } = await getPool().query<Row>(
    `select ${columns} from article order by position, id`
  )
  return rows.map(toArticle)
}

export async function getArticle(id: number): Promise<Article | null> {
  const { rows } = await getPool().query<Row>(
    `select ${columns} from article where id = $1`,
    [id]
  )
  const row = rows[0]
  return row ? toArticle(row) : null
}

export type NewArticle = {
  title: string
  description: string | null
  language: ArticleLanguage
  fileName: string
  originName: string
  fileSize: number
  pageCount: number | null
  coverName: string | null
}

export async function createArticle(input: NewArticle): Promise<void> {
  await getPool().query(
    `insert into article
       (title, description, language, file_name, origin_name, file_size,
        page_count, cover_name, position)
     values ($1, $2, $3, $4, $5, $6, $7, $8,
       -- New papers go to the end of the list rather than jumping the queue.
       coalesce((select max(position) + 1 from article), 0))`,
    [
      input.title,
      input.description,
      input.language,
      input.fileName,
      input.originName,
      input.fileSize,
      input.pageCount,
      input.coverName,
    ]
  )
}

/** Edits the wording. The file is replaced by uploading a new one. */
export async function updateArticle(
  id: number,
  input: { title: string; description: string | null; language: ArticleLanguage }
): Promise<void> {
  await getPool().query(
    `update article
        set title = $2, description = $3, language = $4, updated_at = now()
      where id = $1`,
    [id, input.title, input.description, input.language]
  )
}

export async function replaceArticleFile(
  id: number,
  file: {
    fileName: string
    originName: string
    fileSize: number
    pageCount: number | null
  }
): Promise<void> {
  const previous = await getArticle(id)
  await getPool().query(
    `update article
        set file_name = $2, origin_name = $3, file_size = $4, page_count = $5,
            updated_at = now()
      where id = $1`,
    [id, file.fileName, file.originName, file.fileSize, file.pageCount]
  )
  // Only after the row points at the new one, so a failure here leaves the
  // article downloadable rather than pointing at a file that is gone.
  if (previous && previous.fileName !== file.fileName) {
    await removeArticleFile(previous.fileName)
  }
}

/** Swaps the artwork, removing whatever it replaces. */
export async function replaceArticleCover(id: number, coverName: string): Promise<void> {
  const previous = await getArticle(id)
  await getPool().query(
    `update article set cover_name = $2, updated_at = now() where id = $1`,
    [id, coverName]
  )
  if (previous?.coverName && previous.coverName !== coverName) {
    await removeArticleFile(previous.coverName)
  }
}

export async function removeArticleCover(id: number): Promise<void> {
  const previous = await getArticle(id)
  await getPool().query(
    `update article set cover_name = null, updated_at = now() where id = $1`,
    [id]
  )
  if (previous?.coverName) await removeArticleFile(previous.coverName)
}

export async function setArticlePublished(id: number, published: boolean): Promise<void> {
  await getPool().query(
    `update article set published = $2, updated_at = now() where id = $1`,
    [id, published]
  )
}

/** Swaps a paper with its neighbour, which is how the list gets reordered. */
export async function moveArticle(id: number, direction: -1 | 1): Promise<void> {
  const pool = getPool()
  const { rows } = await pool.query<{ id: number; position: number }>(
    'select id, position from article order by position, id'
  )
  const index = rows.findIndex((row) => row.id === id)
  const swapWith = rows[index + direction]
  if (index < 0 || !swapWith) return

  // Rewritten from the array rather than by swapping two numbers: rows seeded
  // with the same position would otherwise never separate.
  const reordered = [...rows]
  const [moved] = reordered.splice(index, 1)
  if (!moved) return
  reordered.splice(index + direction, 0, moved)

  for (const [position, row] of reordered.entries()) {
    await pool.query('update article set position = $2 where id = $1', [row.id, position])
  }
}

export async function deleteArticle(id: number): Promise<void> {
  const article = await getArticle(id)
  await getPool().query('delete from article where id = $1', [id])
  if (!article) return
  await removeArticleFile(article.fileName)
  if (article.coverName) await removeArticleFile(article.coverName)
}
