import { toLatinDigits } from '@/lib/utils'

/**
 * Recognising things the end-to-end suites created.
 *
 * The suites drive the real running site — real bookings, real receipt
 * uploads, real comments — so every run used to put a stack of push and
 * Telegram alerts in front of the practice for rows deleted seconds later.
 * `notifyAdmin` drops any event these functions recognise.
 *
 * The check lives in production code rather than behind an environment flag
 * because the suites hit a container they cannot reconfigure, and a flag left
 * switched on afterwards would silence real alerts. The worst either of them
 * can do is drop a notification for something no real visitor can create.
 */

/**
 * Phone numbers reserved for the suites.
 *
 * `0912 000 xxxx` is not an allocated Irancell/MCI range, so no visitor holds
 * one. Accepts the E.164 form the public flow stores and the local form the
 * admin form keeps: +989120007777, 989120007777 and 09120007777 are the same.
 */
export function isReservedTestPhone(phone: string | null | undefined): boolean {
  if (!phone) return false
  const digits = toLatinDigits(phone).replace(/\D/g, '')
  const national = digits.replace(/^(?:0098|98|0)/, '')
  return /^912000\d{4}$/.test(national)
}

/**
 * The marker the comment suite writes into the name of every row it creates.
 *
 * Comments carry no phone number, so the reserved range above cannot reach
 * them; a marker in the name does the same job. Persian and hyphenated with a
 * timestamp, it is not something a visitor types by accident.
 */
const TEST_MARKER = 'آزمون‌خودکار-'

export function isTestFixtureName(name: string | null | undefined): boolean {
  return Boolean(name?.includes(TEST_MARKER))
}
