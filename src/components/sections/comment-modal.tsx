'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { submitCommentAction, type CommentState } from './testimonial-actions'
import { CheckIcon, CloseIcon, SpinnerIcon } from '@/components/icons'
import { Flag } from '@/components/ui/flag'
import { NAME_MAX, QUOTE_MAX, QUOTE_MIN, testimonials } from '@/content/testimonials'
import { COUNTRIES, DEFAULT_COUNTRY, searchCountries } from '@/lib/phone'
import { cn, toPersianDigits } from '@/lib/utils'

const initial: CommentState = {}

const field =
  'border-line w-full rounded-xl border bg-white px-4 py-3 text-[0.875rem] text-ink-900 ' +
  'placeholder:text-ink-400/70 transition-colors hover:border-line-strong ' +
  'focus:border-olive-400 focus:outline-none'

/**
 * The form a visitor writes their comment in.
 *
 * Loaded on demand by the section above it — the country list it searches is
 * derived from a phone-number library, and pulling that onto the homepage for
 * a dialog most people never open would be a poor trade.
 */
export function CommentModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(submitCommentAction, initial)
  const copy = testimonials.form

  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [quote, setQuote] = useState('')
  /**
   * Whether to show validation yet.
   *
   * Nothing is marked wrong until the first attempt to send — telling somebody
   * their comment is too short while they are still on the first word is
   * nagging, not help. After that it updates as they type, so the message goes
   * away the moment it stops being true.
   */
  const [attempted, setAttempted] = useState(false)
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY)
  const [term, setTerm] = useState('')
  const [listOpen, setListOpen] = useState(false)

  const chosen = COUNTRIES.find((item) => item.code === country)
  const matches = term ? searchCountries(term).slice(0, 40) : COUNTRIES.slice(0, 40)

  // <dialog> brings focus trapping, Esc, inertness behind and scroll locking
  // with it — all of them easy to get subtly wrong by hand.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const trimmedName = name.trim()
  const trimmedQuote = quote.trim()

  const nameError = trimmedName.length < 2 ? copy.errors.name : null
  const quoteError =
    trimmedQuote.length < QUOTE_MIN
      ? copy.errors.quoteShort
      : trimmedQuote.length > QUOTE_MAX
        ? copy.errors.quoteLong
        : null

  const short = QUOTE_MIN - trimmedQuote.length
  const remaining = QUOTE_MAX - trimmedQuote.length

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
      className={
        'bg-sand-100 text-ink-900 m-auto w-[calc(100%-2rem)] max-w-lg rounded-[var(--radius-band)] p-0 ' +
        'shadow-[var(--shadow-lift)] backdrop:bg-[rgb(42_42_38/0.45)] backdrop:backdrop-blur-[2px]'
      }
    >
      <div className="max-h-[85dvh] overflow-y-auto p-6 lg:p-7">
        {state.done ? (
          <div className="py-6 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-olive-700 text-white">
              <CheckIcon className="size-6" />
            </span>
            <h2 className="text-ink-900 mt-5 text-[1.0625rem] font-bold">{copy.done}</h2>
            <p className="text-ink-500 mt-3 text-[0.875rem] leading-[2]">
              {copy.doneBody}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex h-[3rem] items-center rounded-full bg-olive-700 px-7 text-sm font-medium text-white transition-colors hover:bg-olive-800"
            >
              {copy.close}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-ink-900 text-[1.0625rem] font-bold">{copy.title}</h2>
                <p className="text-ink-500 mt-2 text-[0.8125rem] leading-[1.95]">
                  {copy.intro}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={copy.cancel}
                className="text-ink-400 hover:bg-sand-200 grid size-9 shrink-0 place-items-center rounded-full transition-colors"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            <form
              action={action}
              // The browser's own bubble is the wrong tool here: it speaks the
              // browser's language, not the page's, so a Persian visitor was
              // being told «Please lengthen this text…» in English, pointing at
              // a field in a right-to-left form.
              noValidate
              onSubmit={(event) => {
                setAttempted(true)
                if (nameError || quoteError) event.preventDefault()
              }}
              className="flex flex-col gap-4"
            >
              {state.error ? (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800"
                >
                  {state.error}
                </p>
              ) : null}

              {/* Off-screen and unlabelled: only a bot fills this in. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
              />

              <div>
                <label
                  htmlFor="comment-name"
                  className="text-ink-500 mb-2 block text-[0.8125rem]"
                >
                  {copy.name}
                </label>
                <input
                  id="comment-name"
                  name="name"
                  type="text"
                  maxLength={NAME_MAX}
                  autoComplete="given-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={attempted && nameError ? true : undefined}
                  aria-describedby="comment-name-hint"
                  className={cn(field, attempted && nameError && 'border-red-400')}
                />
                <p
                  id="comment-name-hint"
                  className={cn(
                    'mt-1.5 text-[0.6875rem]',
                    attempted && nameError ? 'text-red-700' : 'text-ink-400'
                  )}
                >
                  {attempted && nameError ? nameError : copy.nameHint}
                </p>
              </div>

              <div>
                <span className="text-ink-500 mb-2 block text-[0.8125rem]">
                  {copy.country}
                </span>
                <input type="hidden" name="country" value={country} />

                <button
                  type="button"
                  onClick={() => setListOpen((open) => !open)}
                  aria-expanded={listOpen}
                  className={`${field} flex items-center gap-2 text-start`}
                >
                  <Flag country={chosen} decorative />
                  {chosen?.name}
                </button>

                {listOpen ? (
                  <div className="border-line mt-2 rounded-xl border bg-white p-2">
                    <input
                      type="search"
                      value={term}
                      onChange={(event) => setTerm(event.target.value)}
                      placeholder={copy.countryPlaceholder}
                      className="text-ink-900 placeholder:text-ink-400/70 w-full px-2 py-1.5 text-[0.8125rem] outline-none"
                    />
                    <ul className="mt-1 max-h-52 overflow-y-auto">
                      {matches.map((item) => (
                        <li key={item.code}>
                          <button
                            type="button"
                            onClick={() => {
                              setCountry(item.code)
                              setListOpen(false)
                              setTerm('')
                            }}
                            className={cn(
                              'hover:bg-sand-100 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-[0.8125rem]',
                              item.code === country && 'bg-sand-100 font-medium'
                            )}
                          >
                            <Flag country={item} decorative />
                            {item.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="comment-quote"
                  className="text-ink-500 mb-2 block text-[0.8125rem]"
                >
                  {copy.comment}
                </label>
                <textarea
                  id="comment-quote"
                  name="quote"
                  rows={5}
                  maxLength={QUOTE_MAX}
                  value={quote}
                  onChange={(event) => setQuote(event.target.value)}
                  aria-invalid={attempted && quoteError ? true : undefined}
                  aria-describedby="comment-quote-hint"
                  className={cn(
                    field,
                    'resize-y leading-[2]',
                    attempted && quoteError && 'border-red-400'
                  )}
                />
                <p
                  id="comment-quote-hint"
                  className={cn(
                    'mt-1.5 flex justify-between gap-3 text-[0.6875rem]',
                    attempted && quoteError ? 'text-red-700' : 'text-ink-400'
                  )}
                >
                  {/* One line that does the work of three: the requirement
                      before they start, the shortfall while they are short,
                      and the headroom once they are past it. */}
                  <span>
                    {short > 0
                      ? copy.needMore(toPersianDigits(short))
                      : copy.left(toPersianDigits(remaining))}
                  </span>
                  <span className="tabular-nums">
                    {toPersianDigits(trimmedQuote.length)} / {toPersianDigits(QUOTE_MIN)}
                  </span>
                </p>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-[3.125rem] items-center gap-2 rounded-full bg-olive-700 px-7 text-sm font-medium text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800 disabled:opacity-60"
                >
                  {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
                  {pending ? copy.sending : copy.submit}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-ink-500 hover:bg-sand-200 rounded-full px-5 py-3 text-[0.8125rem] transition-colors"
                >
                  {copy.cancel}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </dialog>
  )
}
