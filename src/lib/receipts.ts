import 'server-only'

import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { receiptExtension } from '@/lib/receipt-limits'

/**
 * Receipts live on a mounted volume, not in the database and not in /public.
 *
 * Not `public/` because these are private financial documents — anything under
 * it is served to anyone who guesses the URL. They are read back only through
 * an admin-authenticated route.
 */
export const RECEIPT_DIR = process.env.RECEIPT_DIR ?? '/data/receipts'

/** Writes the upload and returns the stored filename (never a full path). */
export async function saveReceipt(file: File): Promise<string> {
  const suffix = receiptExtension(file) ?? extname(file.name)
  // Random name: the original could collide, or carry a path separator.
  const name = `${randomUUID()}${suffix}`

  await mkdir(RECEIPT_DIR, { recursive: true })
  await writeFile(join(RECEIPT_DIR, name), Buffer.from(await file.arrayBuffer()))

  return name
}

export function receiptPath(name: string): string {
  // Guard against `..` or separators smuggled into the stored value.
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '')
  return join(RECEIPT_DIR, safe)
}

export function receiptContentType(name: string): string {
  const ext = extname(name).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.pdf') return 'application/pdf'
  return 'image/jpeg'
}
