import 'server-only'

import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * Where published article PDFs live.
 *
 * A mounted volume rather than `public/`, for the same reason receipts are:
 * anything baked into the image is lost on the next build, and the practice
 * uploads these from the panel. Unlike receipts they are served to anybody —
 * a published paper is meant to be read.
 */
export const ARTICLE_DIR = process.env.ARTICLE_DIR ?? '/data/articles'

/** Only PDFs. The page is a list of papers to download, nothing else. */
export const ARTICLE_MIME = 'application/pdf'
export const MAX_ARTICLE_BYTES = 25 * 1024 * 1024

export function isAllowedArticle(file: { name: string; type: string }): boolean {
  return file.type === ARTICLE_MIME || /\.pdf$/i.test(file.name)
}

/**
 * Cover artwork. Portrait images that carry the paper's title inside them.
 */
export const COVER_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}
export const MAX_COVER_BYTES = 8 * 1024 * 1024

export function coverExtension(file: { name: string; type: string }): string | undefined {
  if (file.type in COVER_TYPES) return COVER_TYPES[file.type]
  // Some pickers hand over an image with no MIME type at all; the extension is
  // then the only thing left to go on.
  const match = /\.(jpe?g|png|webp)$/i.exec(file.name)
  if (!match) return undefined
  const ext = match[0].toLowerCase()
  return ext === '.jpeg' ? '.jpg' : ext
}

export async function saveCoverFile(file: File): Promise<string | undefined> {
  const extension = coverExtension(file)
  if (!extension) return undefined

  const name = `cover-${randomUUID()}${extension}`
  await mkdir(ARTICLE_DIR, { recursive: true })
  await writeFile(join(ARTICLE_DIR, name), Buffer.from(await file.arrayBuffer()))
  return name
}

export function coverContentType(name: string): string {
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

/** Writes the upload and returns the stored filename (never a full path). */
export async function saveArticleFile(file: File): Promise<string> {
  // Random name: the original could collide, or carry a path separator.
  const name = `${randomUUID()}.pdf`
  await mkdir(ARTICLE_DIR, { recursive: true })
  await writeFile(join(ARTICLE_DIR, name), Buffer.from(await file.arrayBuffer()))
  return name
}

export function articlePath(name: string): string {
  // Guard against `..` or separators smuggled into the stored value.
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '')
  return join(ARTICLE_DIR, safe)
}

/** Best effort: a missing file must not stop the row being deleted. */
export async function removeArticleFile(name: string): Promise<void> {
  await unlink(articlePath(name)).catch(() => {})
}

/**
 * How many pages a PDF has, or null when it cannot be read.
 *
 * Parsed properly rather than by scanning for `/Type /Page`: that trick misses
 * files whose page tree lives in a compressed object stream, and of the four
 * papers published here it got one wrong and one not at all. A wrong number on
 * a card is worse than no number, so anything unreadable returns null and the
 * card leaves it out.
 */
export async function countPdfPages(file: Buffer): Promise<number | null> {
  try {
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.load(file, {
      updateMetadata: false,
      ignoreEncryption: true,
    })
    const pages = doc.getPageCount()
    return pages > 0 ? pages : null
  } catch (error) {
    console.error('[articles] could not read the page count', error)
    return null
  }
}

/**
 * Minutes to read, from the page count.
 *
 * Two minutes a page. These are academic papers — dense, two-column, with
 * tables — so the usual 250-words-a-minute prose estimate would flatter them.
 * Presented as «حدود», because it is an estimate and should read as one.
 */
export const READING_MINUTES_PER_PAGE = 2

export function readingMinutes(pages: number): number {
  return Math.max(1, pages * READING_MINUTES_PER_PAGE)
}
