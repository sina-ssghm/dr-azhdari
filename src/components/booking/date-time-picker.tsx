'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { fetchSlotsAction, firstAvailableDateAction } from '@/app/(site)/booking/actions'
import { Panel } from '@/components/booking/panel'
import { JalaliCalendar } from '@/components/ui/jalali-calendar'
import { bookingPage } from '@/content/booking-page'
import { describeDate, persianWeekday } from '@/lib/jalali'
import { timeToMinutes } from '@/lib/time'
import { cn, toPersianDigits } from '@/lib/utils'

/** `Date` → `YYYY-MM-DD`, using the UTC parts the calendar is built from. */
const toIso = (date: Date) => date.toISOString().slice(0, 10)

export function DateTimePicker({
  date,
  times,
  durationMin,
  openWeekdays,
  onSelectDate,
  onToggleTime,
}: {
  date: Date | null
  /** Several start times may be chosen on the same day. */
  times: string[]
  durationMin: number | null
  openWeekdays: number[]
  onSelectDate: (date: Date) => void
  onToggleTime: (time: string) => void
}) {
  const { title, description, emptyDay, selected, pickDuration } = bookingPage.datetime

  const [slots, setSlots] = useState<{ slot: string; taken: boolean }[]>([])
  const [loading, startLoading] = useTransition()

  const selectDateRef = useRef(onSelectDate)
  selectDateRef.current = onSelectDate

  // Read through a ref so the suggestion runs once, without the effect
  // re-firing every time the visitor picks a different day.
  const dateRef = useRef(date)
  dateRef.current = date

  useEffect(() => {
    // Only suggest a day when none has been chosen. Coming back from the
    // review step remounts this picker, and without the guard the suggestion
    // would overwrite the day the visitor already chose — taking their hours
    // with it, since changing the date clears the selection.
    if (dateRef.current) return
    void firstAvailableDateAction().then((iso) => {
      if (iso && !dateRef.current) selectDateRef.current(new Date(`${iso}T12:00:00Z`))
    })
  }, [])

  // Availability depends on the day *and* the session length.
  useEffect(() => {
    if (!date || !durationMin) {
      setSlots([])
      return
    }
    const iso = toIso(date)
    startLoading(async () => setSlots(await fetchSlotsAction(iso, durationMin)))
  }, [date, durationMin])

  const label = date ? describeDate(date) : null
  const hasSchedule = openWeekdays.length > 0

  // The grid only renders once a duration is known; 60 is a dormant fallback.
  const sessionLength = durationMin ?? 60

  /** Would starting here run into an hour already chosen? */
  const clashesWithPicked = (slot: string) =>
    times.some(
      (picked) => Math.abs(timeToMinutes(picked) - timeToMinutes(slot)) < sessionLength
    )

  const free = slots.filter((s) => !s.taken && !clashesWithPicked(s.slot))

  return (
    <Panel title={title} description={description}>
      <div className="grid gap-4 sm:grid-cols-[1fr_1.05fr] lg:gap-5">
        <JalaliCalendar
          value={date}
          onChange={onSelectDate}
          isDisabled={(cell) =>
            hasSchedule && !openWeekdays.includes(persianWeekday(cell.date))
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
            ) : !date ? null : slots.length === 0 ? (
              <p className="text-ink-400 py-8 text-center text-[0.75rem] leading-[1.9]">
                {hasSchedule
                  ? 'برای این روز ساعت آزادی وجود ندارد.'
                  : 'ساعات کاری هنوز تنظیم نشده است. لطفاً تلفنی هماهنگ کنید.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map(({ slot, taken }) => {
                  const isPicked = times.includes(slot)
                  // Two chosen hours must not run into each other: 16:30 and
                  // 17:00 are separate starts, but as 60-minute sessions they
                  // are the same half hour twice.
                  const clashes = !isPicked && clashesWithPicked(slot)
                  const blocked = taken || clashes
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={blocked}
                      onClick={() => onToggleTime(slot)}
                      aria-pressed={isPicked}
                      title={
                        taken
                          ? 'رزرو شده'
                          : clashes
                            ? 'با ساعت انتخاب‌شده هم‌پوشانی دارد'
                            : undefined
                      }
                      className={cn(
                        'border-line h-9 rounded-lg border text-[0.75rem] tabular-nums transition-all duration-200',
                        taken &&
                          'text-ink-400/50 bg-sand-100 cursor-default line-through',
                        clashes && 'text-ink-400/40 bg-sand-50 cursor-default',
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
            {times.length > 0
              ? toPersianDigits(selected(times.length))
              : durationMin && !loading && slots.length > 0
                ? `${toPersianDigits(free.length)} ساعت آزاد`
                : ' '}
          </p>
        </div>
      </div>
    </Panel>
  )
}
