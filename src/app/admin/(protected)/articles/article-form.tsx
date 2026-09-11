'use client'

import { useActionState, useRef } from 'react'
import { editArticleAction, uploadArticleAction, type ArticleState } from './actions'
import { SubmitButton } from '@/components/admin/submit-button'
import { inputClass, Notice } from '@/components/admin/ui'
import { ARTICLE_LANGUAGES, DESCRIPTION_MAX, TITLE_MAX } from '@/content/articles-page'
import type { Article } from '@/server/articles'

const initial: ArticleState = {}

/**
 * Adds a paper, or edits one.
 *
 * The same fields either way; the difference is that editing keeps the file
 * unless a new one is picked, so a typo in a title does not mean re-uploading
 * twenty megabytes.
 */
export function ArticleForm({
  article,
  onDone,
}: {
  article?: Article
  onDone?: () => void
}) {
  const [state, action] = useActionState(
    article ? editArticleAction : uploadArticleAction,
    initial
  )
  const formRef = useRef<HTMLFormElement>(null)

  // Clearing after a successful upload, so the next paper starts from empty
  // rather than from the last one's title.
  if (state.success && !article) formRef.current?.reset()
  if (state.success && article) onDone?.()

  const id = article ? `edit-${article.id}` : 'new'

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      {article ? <input type="hidden" name="id" value={article.id} /> : null}

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.success ? (
        <Notice tone="success">
          {article ? 'تغییرات ذخیره شد.' : 'مقاله منتشر شد.'}
        </Notice>
      ) : null}

      <div>
        <label htmlFor={`title-${id}`} className="text-ink-500 mb-2 block text-[0.75rem]">
          عنوان مقاله
        </label>
        <input
          id={`title-${id}`}
          name="title"
          type="text"
          maxLength={TITLE_MAX}
          defaultValue={article?.title}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor={`description-${id}`}
          className="text-ink-500 mb-2 block text-[0.75rem]"
        >
          توضیح کوتاه (اختیاری)
        </label>
        <textarea
          id={`description-${id}`}
          name="description"
          rows={3}
          maxLength={DESCRIPTION_MAX}
          defaultValue={article?.description ?? ''}
          className={`${inputClass} resize-y leading-[2]`}
        />
      </div>

      <div>
        <label
          htmlFor={`language-${id}`}
          className="text-ink-500 mb-2 block text-[0.75rem]"
        >
          زبان مقاله
        </label>
        <select
          id={`language-${id}`}
          name="language"
          defaultValue={article?.language ?? 'fa'}
          className={inputClass}
        >
          {Object.entries(ARTICLE_LANGUAGES).map(([code, meta]) => (
            <option key={code} value={code}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`cover-${id}`} className="text-ink-500 mb-2 block text-[0.75rem]">
          {article ? 'جایگزینی تصویر جلد (اختیاری)' : 'تصویر جلد (اختیاری)'}
        </label>
        <input
          id={`cover-${id}`}
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className={`${inputClass} file:bg-sand-200 file:me-3 file:rounded-full file:border-0 file:px-4 file:py-1.5 file:text-[0.75rem]`}
        />
        <p className="text-ink-400 mt-1.5 text-[0.6875rem]">
          تصویر عمودی؛ اگر عنوان مقاله روی تصویر باشد، در کارت تکرار نمی‌شود.
        </p>
      </div>

      <div>
        <label htmlFor={`file-${id}`} className="text-ink-500 mb-2 block text-[0.75rem]">
          {article ? 'جایگزینی فایل PDF (اختیاری)' : 'فایل PDF'}
        </label>
        <input
          id={`file-${id}`}
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          className={`${inputClass} file:bg-sand-200 file:me-3 file:rounded-full file:border-0 file:px-4 file:py-1.5 file:text-[0.75rem]`}
        />
        <p className="text-ink-400 mt-1.5 text-[0.6875rem]">
          {article
            ? 'اگر فایلی انتخاب نکنید، فایل فعلی حفظ می‌شود.'
            : 'حداکثر ۲۵ مگابایت.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="در حال بارگذاری…">
          {article ? 'ذخیره تغییرات' : 'افزودن مقاله'}
        </SubmitButton>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="text-ink-500 hover:bg-sand-200 rounded-full px-5 py-2.5 text-[0.8125rem] transition-colors"
          >
            بستن
          </button>
        ) : null}
      </div>
    </form>
  )
}
