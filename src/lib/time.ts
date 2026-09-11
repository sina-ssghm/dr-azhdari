/**
 * Clock arithmetic shared by the availability grid, the admin schedule editor
 * and both pickers. Times are `HH:MM` strings; minutes are offsets from
 * midnight, which is the only form that is safe to compare and add.
 */

/** `08:23` → 503. Tolerates the `HH:MM:SS` Postgres returns. */
export function timeToMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

/** 503 → `08:23`. */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`
}

/** Half-open minute range: `[from, to)`. */
export type Interval = { from: number; to: number }

/**
 * Half-open on purpose: a session ending at 10:00 and one starting at 10:00
 * are back-to-back, not a clash.
 */
export const intervalsOverlap = (a: Interval, b: Interval) =>
  a.from < b.to && b.from < a.to
