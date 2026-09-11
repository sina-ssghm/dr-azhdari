import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { receiptContentType, receiptPath } from '@/lib/receipts'
import { getCurrentAdmin } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Serves an uploaded receipt to a signed-in admin.
 *
 * Receipts are financial documents, so they are stored outside `public/` and
 * only ever reach the browser through this authenticated route.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const admin = await getCurrentAdmin().catch(() => null)
  if (!admin) return new NextResponse('Unauthorized', { status: 401 })

  const { name } = await params

  try {
    const file = await readFile(receiptPath(name))
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': receiptContentType(name),
        'Content-Disposition': `inline; filename="${encodeURIComponent(name)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
