'use server'

import { revalidatePath } from 'next/cache'
import {
  DESCRIPTION_MAX,
  isArticleLanguage,
  TITLE_MAX,
  type ArticleLanguage,
} from '@/content/articles-page'
import {
  countPdfPages,
  coverExtension,
  isAllowedArticle,
  MAX_ARTICLE_BYTES,
  MAX_COVER_BYTES,
  removeArticleFile,
  saveArticleFile,
  saveCoverFile,
} from '@/lib/articles'
import { requireAdmin } from '@/server/session'
import {
  createArticle,
  deleteArticle,
  moveArticle,
  removeArticleCover,
  replaceArticleCover,
  replaceArticleFile,
  setArticlePublished,
  updateArticle,
} from '@/server/articles'

export type ArticleState = { error?: string; success?: boolean }

function refresh() {
  revalidatePath('/articles')
  revalidatePath('/admin/articles')
}

const read = (formData: FormData, key: string) => {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

/** Shared by the upload form and the edit dialog. */
function readFields(
  formData: FormData
): { title: string; description: string | null; language: ArticleLanguage } | string {
  const title = read(formData, 'title').slice(0, TITLE_MAX)
  if (title.length < 3) return 'عنوان مقاله را وارد کنید.'

  const description = read(formData, 'description').slice(0, DESCRIPTION_MAX)
  // Anything unrecognised falls back to Persian rather than being rejected —
  // the select only offers two, so this is a hand-crafted request.
  const raw = read(formData, 'language')
  const language: ArticleLanguage = isArticleLanguage(raw) ? raw : 'fa'

  return { title, description: description || null, language }
}

/**
 * Reads an optional cover from the form.
 *
 * Returns undefined when none was picked, a string when one was picked and
 * rejected, and the stored filename when it was accepted — so the caller can
 * tell "no cover" apart from "bad cover" without a second flag.
 */
async function readCover(
  formData: FormData
): Promise<string | undefined | { error: string }> {
  const cover = formData.get('cover')
  if (!(cover instanceof File) || cover.size === 0) return undefined
  if (cover.size > MAX_COVER_BYTES) {
    return { error: 'حجم تصویر جلد نباید بیشتر از ۸ مگابایت باشد.' }
  }
  if (!coverExtension(cover)) {
    return { error: 'تصویر جلد باید JPG، PNG یا WebP باشد.' }
  }
  const stored = await saveCoverFile(cover)
  return stored ?? { error: 'ذخیره تصویر جلد ناموفق بود.' }
}

export async function uploadArticleAction(
  _previous: ArticleState,
  formData: FormData
): Promise<ArticleState> {
  await requireAdmin()

  const fields = readFields(formData)
  if (typeof fields === 'string') return { error: fields }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'فایل PDF مقاله را انتخاب کنید.' }
  }
  if (file.size > MAX_ARTICLE_BYTES) {
    return { error: 'حجم فایل نباید بیشتر از ۲۵ مگابایت باشد.' }
  }
  if (!isAllowedArticle(file)) return { error: 'فقط فایل PDF پذیرفته می‌شود.' }

  const cover = await readCover(formData)
  if (cover && typeof cover === 'object') return { error: cover.error }

  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const stored = await saveArticleFile(file)
    await createArticle({
      ...fields,
      fileName: stored,
      originName: file.name,
      fileSize: file.size,
      pageCount: await countPdfPages(bytes),
      coverName: cover ?? null,
    })
  } catch (error) {
    console.error('[admin] uploading an article failed', error)
    return { error: 'بارگذاری مقاله ناموفق بود.' }
  }

  refresh()
  return { success: true }
}

export async function editArticleAction(
  _previous: ArticleState,
  formData: FormData
): Promise<ArticleState> {
  await requireAdmin()

  const id = Number(read(formData, 'id'))
  if (!Number.isInteger(id) || id <= 0) return { error: 'مقاله یافت نشد.' }

  const fields = readFields(formData)
  if (typeof fields === 'string') return { error: fields }

  const cover = await readCover(formData)
  if (cover && typeof cover === 'object') return { error: cover.error }

  try {
    await updateArticle(id, fields)
    if (cover) await replaceArticleCover(id, cover)

    // Replacing the file is optional: an empty picker means only the wording
    // was being edited.
    const file = formData.get('file')
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_ARTICLE_BYTES) {
        return { error: 'حجم فایل نباید بیشتر از ۲۵ مگابایت باشد.' }
      }
      if (!isAllowedArticle(file)) return { error: 'فقط فایل PDF پذیرفته می‌شود.' }

      const bytes = Buffer.from(await file.arrayBuffer())
      const stored = await saveArticleFile(file)
      try {
        await replaceArticleFile(id, {
          fileName: stored,
          originName: file.name,
          fileSize: file.size,
          pageCount: await countPdfPages(bytes),
        })
      } catch (error) {
        // The row still points at the old file, so clean up the orphan.
        await removeArticleFile(stored)
        throw error
      }
    }
  } catch (error) {
    console.error('[admin] editing an article failed', error)
    return { error: 'ذخیره‌سازی ناموفق بود.' }
  }

  refresh()
  return { success: true }
}

export async function removeCoverAction(id: number): Promise<void> {
  await requireAdmin()
  await removeArticleCover(id)
  refresh()
}

export async function setPublishedAction(id: number, published: boolean): Promise<void> {
  await requireAdmin()
  await setArticlePublished(id, published)
  refresh()
}

export async function moveArticleAction(id: number, direction: -1 | 1): Promise<void> {
  await requireAdmin()
  await moveArticle(id, direction)
  refresh()
}

export async function deleteArticleAction(id: number): Promise<void> {
  await requireAdmin()
  await deleteArticle(id)
  refresh()
}
