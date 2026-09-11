import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { articlePath } from '@/lib/articles'
import { getArticle } from '@/server/articles'

export const dynamic = 'force-dynamic'

/**
 * Serves a published article's PDF.
 *
 * Deliberately unauthenticated — these are papers the practice publishes — but
 * still routed rather than served from `public/`, because the files live on a
 * volume so they survive rebuilds and can be uploaded from the panel.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const article = await getArticle(Number(id)).catch(() => null)

  // An unpublished paper is not found, rather than forbidden: whether a draft
  // exists is not something a visitor needs to learn.
  if (!article || !article.published) {
    return new NextResponse('Not found', { status: 404 })
  }

  let file: Buffer
  try {
    file = await readFile(articlePath(article.fileName))
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/pdf',
      // `attachment`, so it downloads rather than replacing the page with a
      // viewer. The title is the filename, so what lands in Downloads is
      // recognisable rather than a uuid.
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(
        `${article.title}.pdf`
      )}`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
