import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { articlePath, coverContentType } from '@/lib/articles'
import { getArticle } from '@/server/articles'

export const dynamic = 'force-dynamic'

/** Serves a published article's cover artwork. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const article = await getArticle(Number(id)).catch(() => null)

  if (!article || !article.published || !article.coverName) {
    return new NextResponse('Not found', { status: 404 })
  }

  let file: Buffer
  try {
    file = await readFile(articlePath(article.coverName))
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': coverContentType(article.coverName),
      // The filename carries a uuid, so a cached copy can never be the wrong
      // image — replacing a cover writes a new name.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
