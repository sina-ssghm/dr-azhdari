'use client'

import { useState } from 'react'
import { ArticleForm } from './article-form'
import {
  deleteArticleAction,
  moveArticleAction,
  removeCoverAction,
  setPublishedAction,
} from './actions'
import { ActionButton } from '@/components/admin/action-button'
import { Modal } from '@/components/admin/modal'
import { OverflowMenu } from '@/components/admin/overflow-menu'
import { Badge } from '@/components/admin/ui'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import type { Article } from '@/server/articles'
import { toPersianDigits } from '@/lib/utils'

export function ArticleRow({
  article,
  first,
  last,
}: {
  article: Article
  first: boolean
  last: boolean
}) {
  const [editing, setEditing] = useState(false)

  const size = toPersianDigits((article.fileSize / (1024 * 1024)).toFixed(1))
  const added = toPersianDigits(
    new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(
      new Date(article.createdAt)
    )
  )

  return (
    <li className="border-line rounded-xl border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 gap-3">
          {article.coverName ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/articles/${article.id}/cover`}
              alt=""
              loading="lazy"
              className="border-line bg-sand-100 h-[4.5rem] w-[2.6rem] shrink-0 rounded-md border object-contain"
            />
          ) : (
            <span className="border-line bg-sand-100 text-ink-400 grid h-[4.5rem] w-[2.6rem] shrink-0 place-items-center rounded-md border border-dashed text-[0.5625rem]">
              بدون جلد
            </span>
          )}

          <div className="min-w-0">
            {/* Same reason as the public card: titles are not all Persian. */}
            <p
              dir="auto"
              className="text-ink-900 text-[0.875rem] leading-[1.9] font-medium"
            >
              {article.title}
            </p>
            {article.description ? (
              <p dir="auto" className="text-ink-500 mt-1.5 text-[0.75rem] leading-[1.95]">
                {article.description}
              </p>
            ) : null}
            <p className="text-ink-400 mt-2 text-[0.6875rem]">
              PDF · {size} مگابایت · {added}
            </p>
          </div>
        </div>
        <Badge tone={article.published ? 'green' : 'neutral'}>
          {article.published ? 'منتشر شده' : 'پنهان'}
        </Badge>
      </div>

      <div className="border-line flex flex-wrap items-center gap-1 border-t px-3 py-2">
        <a
          href={`/api/articles/${article.id}`}
          className="text-ink-500 hover:bg-sand-200 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors"
        >
          دانلود فایل
        </a>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-ink-500 hover:bg-sand-200 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors"
        >
          ویرایش
        </button>

        {/* In RTL the earlier position is to the right, so the chevrons match
            the direction the row actually travels. */}
        <ActionButton
          tone="neutral"
          disabled={first}
          onAction={() => moveArticleAction(article.id, -1)}
        >
          <ChevronRightIcon className="size-3.5" />
        </ActionButton>
        <ActionButton
          tone="neutral"
          disabled={last}
          onAction={() => moveArticleAction(article.id, 1)}
        >
          <ChevronLeftIcon className="size-3.5" />
        </ActionButton>

        <OverflowMenu>
          {article.coverName ? (
            <ActionButton
              tone="neutral"
              onAction={() => removeCoverAction(article.id)}
              confirm={{
                title: 'حذف تصویر جلد',
                body: 'کارت این مقاله به حالت متنی برمی‌گردد و عنوان روی آن نمایش داده می‌شود.',
                confirmLabel: 'حذف کن',
              }}
            >
              حذف تصویر جلد
            </ActionButton>
          ) : null}
          <ActionButton
            tone="neutral"
            onAction={() => setPublishedAction(article.id, !article.published)}
          >
            {article.published ? 'پنهان کردن' : 'انتشار'}
          </ActionButton>
          <ActionButton
            tone="danger"
            onAction={() => deleteArticleAction(article.id)}
            confirm={{
              title: 'حذف مقاله',
              body: 'مقاله و فایل PDF آن برای همیشه حذف می‌شود.',
              confirmLabel: 'حذف کن',
            }}
          >
            حذف
          </ActionButton>
        </OverflowMenu>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="ویرایش مقاله"
        description="عنوان و توضیح را می‌توانید تغییر دهید، و در صورت نیاز فایل را جایگزین کنید."
      >
        <ArticleForm article={article} onDone={() => setEditing(false)} />
      </Modal>
    </li>
  )
}
