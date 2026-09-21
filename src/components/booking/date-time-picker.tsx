'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  fetchSlotsAction,
  firstAvailableDateAction,
  type BookingSlot,
} from '@/app/(site)/booking/actions'
import { Panel } from '@/components/booking/panel'
import { CloseIcon } from '@/components/icons'
import { JalaliCalendar } from '@/components/ui/jalali-calendar'
import { bookingLimits, bookingPage } from '@/content/booking-page'
import { describeDate, persianWeekday } from '@/lib/jalali'
import { timeToMinutes } from '@/lib/time'
import { cn, toPersianDigits } from '@/lib/utils'

/** `Date` → `YYYY-MM-DD`, using the UTC parts the calendar is built from. */
const toIso = (date: Date) => date.toISOString().slice(0, 10)

export function DateTimePicker({
  viewDate,
  slots,
  durationMin,
  openWeekdays,
  maxDate,
  atMax,
  onSelectDate,
  onToggleSlot,
  onRemoveSlot,
}: {
  /** The day whose hours are on show — a cursor, not part of the booking. */
  viewDate: Date | null
  /** Every appointment chosen so far, across all days. */
  slots: BookingSlot[]
  durationMin: number | null
  openWeekdays: number[]
  /** No day beyond this may be chosen. */
  maxDate: Date
  /** The appointment cap has been reached; only removals are allowed. */
  atMax: boolean
  onSelectDate: (date: Date) => void
  onToggleSlot: (date: string, time: string) => void
  onRemoveSlot: (date: string, time: string) => void
}) {
  const copy = bookingPage.datetime
  const { title, description, emptyDay, pickDuration } = copy

  const [daySlots, setDaySlots] = useState<{ slot: string; taken: boolean }[]>([])
  const [loading, startLoading] = useTransition()

  const selectDateRef = useRef(onSelectDate)
  selectDateRef.current = onSelectDate

  // Read through a ref so the suggestion runs once, without the effect
  // re-firing every time the visitor picks a different day.
  const dateRef = useRef(viewDate)
  dateRef.current = viewDate

  useEffect(() => {
    // Only suggest a day when none is on show. Coming back from a later step
    // remounts this picker, and without the guard the suggestion would jump
    // the calendar off the day the visitor was last looking at.
    if (dateRef.current) return
    void firstAvailableDateAction().then((iso) => {
      if (iso && !dateRef.current) selectDateRef.current(new Date(`${iso}T12:00:00Z`))
    })
  }, [])

  // Availability depends on the day *and* the session length.
  useEffect(() => {
    if (!viewDate || !durationMin) {
      setDaySlots([])
      return
    }
    const iso = toIso(viewDate)
    startLoading(async () => setDaySlots(await fetchSlotsAction(iso, durationMin)))
  }, [viewDate, durationMin])

  const isoView = viewDate ? toIso(viewDate) : null
  const label = viewDate ? describeDate(viewDate) : null
  const hasSchedule = openWeekdays.length > 0

  // The grid only renders once a duration is known; 60 is a dormant fallback.
  const sessionLength = durationMin ?? 60

  /** The hours already chosen on the day currently on show. */
  const pickedTimes = useMemo(
    () => (isoView ? slots.filter((s) => s.date === isoView).map((s) => s.time) : []),
    [slots, isoView]
  )

  /** Would starting here run into an hour already chosen on this same day? */
  const clashesWithPicked = (slot: string) =>
    pickedTimes.some(
      (picked) => Math.abs(timeToMinutes(picked) - timeToMinutes(slot)) < sessionLength
    )

  const free = daySlots.filter((s) => !s.taken && !clashesWithPicked(s.slot))

  /** The full chosen list, grouped by day for the summary. */
  const grouped = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const s of slots) {
      const list = map.get(s.date) ?? []
      list.push(s.time)
      map.set(s.date, list)
    }
    return [...map.entries()]
  }, [slots])

  return (
    <Panel title={title} description={description}>
      <div className="grid gap-4 sm:grid-cols-[1fr_1.05fr] lg:gap-5">
        <JalaliCalendar
          value={viewDate}
          onChange={onSelectDate}
          isDisabled={(cell) =>
            cell.date.getTime() > maxDate.getTime() ||
            (hasSchedule && !openWeekdays.includes(persianWeekday(cell.date)))
          }
          className="bg-white/70 sm:order-2"
        />

        <div className="border-line flex flex-col rounded-2xl border bg-white/70 p-4 sm:order-1">
          {label ? (
            <div className="text-center">
              <p className="text-ink-900 text-[0.8125rem] font-semibold">
                {label.weekday}
              </p>
              <p className="text-ink-400 mt-1 text-[0.75rem]">
                {toPersianDigits(label.full)}
              </p>
            </div>
          ) : (
            <p className="text-ink-400 text-center text-[0.75rem] leading-[1.9]">
              {emptyDay}
            </p>
          )}

          <div className="mt-4 min-h-[9rem]">
            {!durationMin ? (
              <p className="text-ink-400 py-8 text-center text-[0.75rem]">
                {pickDuration}
              </p>
            ) : loading ? (
              <p className="text-ink-400 py-8 text-center text-[0.75rem]">
                در حال بررسی ساعت‌های آزاد…
              </p>
            ) : !viewDate ? null : daySlots.length === 0 ? (
              <p className="text-ink-400 py-8 text-center text-[0.75rem] leading-[1.9]">
                {hasSchedule
                  ? 'برای این روز ساعت آزادی وجود ندارد.'
                  : 'ساعات کاری هنوز تنظیم نشده است. لطفاً تلفنی هماهنگ کنید.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {daySlots.map(({ slot, taken }) => {
                  const isPicked = pickedTimes.includes(slot)
                  // Keep this overlap guard even though public starts are on
                  // the hour: session lengths can differ, and selections must
                  // never run into one another.
                  const clashes = !isPicked && clashesWithPicked(slot)
                  // At the cap, an unpicked hour cannot be added — only the
                  // ones already chosen stay pressable so they can be dropped.
                  const capped = !isPicked && atMax
                  const blocked = taken || clashes || capped
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={blocked}
                      onClick={() => isoView && onToggleSlot(isoView, slot)}
                      aria-pressed={isPicked}
                      title={
                        taken
                          ? 'رزرو شده'
                          : clashes
                            ? 'با ساعت انتخاب‌شده هم‌پوشانی دارد'
                            : capped
                              ? copy.maxReached(bookingLimits.maxAppointments)
                              : undefined
                      }
                      className={cn(
                        'border-line h-9 rounded-lg border text-[0.75rem] tabular-nums transition-all duration-200',
                        taken &&
                          'text-ink-400/50 bg-sand-100 cursor-default line-through',
                        (clashes || capped) && 'text-ink-400/40 bg-sand-50 cursor-default',
                        !blocked &&
                          !isPicked &&
                          'text-ink-700 bg-white hover:border-olive-400',
                        isPicked &&
                          'border-olive-700 bg-olive-700 font-semibold text-white'
                      )}
                    >
                      {toPersianDigits(slot)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <p className="border-line text-ink-400 mt-4 border-t pt-3 text-center text-[0.6875rem]">
            {pickedTimes.length > 0
              ? toPersianDigits(`${pickedTimes.length} نوبت در این روز`)
              : durationMin && !loading && daySlots.length > 0
                ? `${toPersianDigits(free.length)} ساعت آزاد`
                : ' '}
          </p>
        </div>
      </div>

      {/* The running list of chosen appointments, across every day. This is
          how "add more" reads: pick another day or hour and it lands here,
          each one removable, up to the cap. */}
      <div className="border-line mt-5 rounded-2xl border bg-white/70 p-4">
        <p className="text-ink-900 text-[0.8125rem] font-semibold">{copy.listTitle}</p>

        {slots.length === 0 ? (
          <p className="text-ink-400 mt-3 text-center text-[0.75rem] leading-[1.9]">
            {copy.emptyList}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {grouped.map(([date, times]) => {
              const when = describeDate(new Date(`${date}T12:00:00Z`))
              return (
                <li
                  key={date}
                  className="border-line bg-sand-50 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5"
                >
                  <span className="text-ink-900 text-[0.75rem] font-medium">
                    {toPersianDigits(`${when.weekday} ${when.full}`)}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {times.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => onRemoveSlot(date, time)}
                        aria-label={`${copy.remove} ${toPersianDigits(time)}`}
                        className="border-olive-200 text-olive-800 hover:bg-olive-50 inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[0.6875rem] tabular-nums transition-colors"
                      >
                        <span dir="ltr">{toPersianDigits(time)}</span>
                        <CloseIcon className="size-3" />
                      </button>
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <p
          className={cn(
            'mt-3 text-center text-[0.6875rem] leading-[1.9]',
            atMax ? 'text-amber-800' : 'text-ink-400'
          )}
        >
          {atMax ? copy.maxReached(bookingLimits.maxAppointments) : copy.addHint}
        </p>
      </div>
    </Panel>
  )
}
