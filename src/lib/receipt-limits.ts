/**
 * What counts as an acceptable receipt.
 *
 * Kept apart from `lib/receipts.ts`, which is server-only: the uploader needs
 * the same limits to reject a file before spending a minute sending it, and
 * two copies of these numbers would drift.
 */

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024

export const RECEIPT_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
} as const

export type ReceiptType = keyof typeof RECEIPT_TYPES

/** The same set again, keyed by the extensions a filename might carry. */
const EXTENSION_TYPES: Record<string, ReceiptType> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

/**
 * For the file input's `accept`, so the picker filters by default.
 *
 * Extensions are listed alongside the MIME types because some Android pickers
 * match on one and not the other, and a receipt that the picker greys out is
 * indistinguishable to the visitor from a broken form.
 */
export const RECEIPT_ACCEPT = [
  ...Object.keys(RECEIPT_TYPES),
  ...Object.keys(EXTENSION_TYPES),
].join(',')

type FileLike = { name: string; type: string }

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot).toLowerCase()
}

/**
 * What we will treat a file as.
 *
 * The browser's `type` first, then the filename. Google Drive, Telegram and
 * several Android file managers hand over a perfectly ordinary JPEG with an
 * empty type or `application/octet-stream`; going only on `type` told those
 * visitors their receipt was "not an image" while they were looking at it.
 */
export function resolveReceiptType(file: FileLike): ReceiptType | undefined {
  if (file.type in RECEIPT_TYPES) return file.type as ReceiptType
  return EXTENSION_TYPES[extensionOf(file.name)]
}

export function isAllowedReceipt(file: FileLike): boolean {
  return resolveReceiptType(file) !== undefined
}

/**
 * A photo straight off an iPhone.
 *
 * Worth naming separately: it is a real image, so "only images are accepted"
 * reads as a lie, and the visitor needs to be told what to do instead. Not
 * simply accepted, because browsers other than Safari cannot display HEIC and
 * the practice has to be able to look at the receipt.
 */
export function isHeicReceipt(file: FileLike): boolean {
  return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

export function receiptExtension(file: FileLike): string | undefined {
  const type = resolveReceiptType(file)
  return type && RECEIPT_TYPES[type]
}
