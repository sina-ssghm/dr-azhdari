import type { Metadata } from 'next'
import { ArticleForm } from './article-form'
import { ArticleRow } from './article-row'
import { Card, EmptyState, PageHeader } from '@/components/admin/ui'
import { listArticles } from '@/server/articles'

export const metadata: Metadata = { title: 'مقالات' }
export const dynamic = 'force-dynamic'

export default async function AdminArticlesPage() {
  const articles = await listArticles()

  return (
    <>
      <PageHeader
        title="مقالات"
        description="مقاله‌هایی که روی سایت برای دانلود قرار می‌گیرند. هر مقاله یک فایل PDF است با یک عنوان و توضیح کوتاه؛ ترتیب نمایش را هم از همین‌جا تعیین می‌کنید."
      />

      <div className="flex flex-col gap-4">
        <Card title="مقاله‌های منتشرشده">
          {articles.length === 0 ? (
            <EmptyState>هنوز مقاله‌ای اضافه نشده است.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {articles.map((article, i) => (
                <ArticleRow
                  key={article.id}
                  article={article}
                  first={i === 0}
                  last={i === articles.length - 1}
                />
              ))}
            </ul>
          )}
        </Card>

        {/* Below the list: adding a paper is occasional, reading what is
            already published is what the page is opened for. */}
        <Card title="افزودن مقاله" description="عنوان، توضیح کوتاه اختیاری، و فایل PDF.">
          <ArticleForm />
        </Card>
      </div>
    </>
  )
}
