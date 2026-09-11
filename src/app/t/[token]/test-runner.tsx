'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { saveProgressAction, submitTestAction } from './actions'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SpinnerIcon,
} from '@/components/icons'
import type { PsyTest } from '@/content/tests'
import { testsPage } from '@/content/tests-page'
import { choicesFor, firstUnanswered, type Answers } from '@/lib/test-scoring'
import { cn, toPersianDigits } from '@/lib/utils'

/** How long after the last answer the progress is pushed to the server. */
const SAVE_DEBOUNCE_MS = 1200

/**
 * One question at a time.
 *
 * Not a long scrolling form: the shortest of these is 21 questions and the
 * longest 75, and a wall of radio buttons on a phone is how somebody abandons
 * a test they have already paid for. One question fills the screen, the
 * answers are large enough to hit with a thumb, and choosing one moves on by
 * itself — so the common case is a single tap per question with no hunting for
 * a Next button.
 */
export function TestRunner({
  token,
  test,
  initialAnswers,
}: {
  token: string
  test: PsyTest
  initialAnswers: Answers
}) {
  const router = useRouter()
  const copy = testsPage.run

  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  // Resume where they stopped rather than at question one.
  const [index, setIndex] = useState(() => firstUnanswered(test, initialAnswers))
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()

  const headingRef = useRef<HTMLParagraphElement>(null)
  const advanceRef = useRef<number | null>(null)
  const saveRef = useRef<number | null>(null)
  const latest = useRef(answers)
  latest.current = answers

  const total = test.questions.length
  const answered = Object.keys(answers).length
  const question = test.questions[index]

  /* --------------------------- saving progress --------------------------- */

  const flush = useCallback(() => {
    if (saveRef.current !== null) window.clearTimeout(saveRef.current)
    saveRef.current = null
    void saveProgressAction(token, latest.current)
  }, [token])

  const scheduleSave = useCallback(() => {
    if (saveRef.current !== null) window.clearTimeout(saveRef.current)
    saveRef.current = window.setTimeout(flush, SAVE_DEBOUNCE_MS)
  }, [flush])

  useEffect(() => {
    // A backgrounded tab on a phone may never come back, so the pending save
    // goes out the moment the page is hidden rather than on unload, which
    // mobile browsers are entitled to skip.
    const onHide = () => {
      if (document.visibilityState === 'hidden' && saveRef.current !== null) flush()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      if (saveRef.current !== null) window.clearTimeout(saveRef.current)
      if (advanceRef.current !== null) window.clearTimeout(advanceRef.current)
    }
  }, [flush])

  /* ------------------------------ answering ------------------------------ */

  const goTo = useCallback((next: number) => {
    if (advanceRef.current !== null) window.clearTimeout(advanceRef.current)
    setReviewing(false)
    setIndex(next)
    // Moves the screen reader — and a phone's focus ring — onto the new
    // question instead of leaving it on a button that has just changed meaning.
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }, [])

  const answer = (value: number) => {
    if (!question) return
    setAnswers((current) => ({ ...current, [String(question.id)]: value }))
    setError(null)
    scheduleSave()

    // A beat of delay so the choice is visibly registered before the question
    // changes; instant advance reads as if the tap went somewhere else.
    if (advanceRef.current !== null) window.clearTimeout(advanceRef.current)
    if (index < total - 1) {
      advanceRef.current = window.setTimeout(() => goTo(index + 1), 220)
    } else {
      advanceRef.current = window.setTimeout(() => setReviewing(true), 220)
    }
  }

  /* ------------------------------ submitting ----------------------------- */

  const submit = () => {
    const missing = test.questions.filter(
      (q) => typeof answers[String(q.id)] !== 'number'
    )
    if (missing.length > 0) {
      setError(copy.unanswered)
      return
    }
    startSubmit(async () => {
      const state = await submitTestAction(token, answers)
      if (state.error) {
        setError(state.error)
        return
      }
      // The server now holds the result; the page re-renders as the result.
      router.refresh()
    })
  }

  /* -------------------------------- render ------------------------------- */

  const progress = Math.round((answered / total) * 100)

  const bar = (
    <div className="mb-7">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-ink-500 text-[0.8125rem]">
          {reviewing
            ? copy.reviewTitle
            : `${toPersianDigits(index + 1)} ${copy.of} ${toPersianDigits(total)}`}
        </span>
        <span className="text-[0.8125rem] font-bold text-olive-700 tabular-nums">
          {toPersianDigits(progress)}٪
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={copy.progress}
        className="bg-sand-200 h-2 w-full overflow-hidden rounded-full"
      >
        <div
          className="h-full rounded-full bg-olive-700 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )

  if (reviewing) {
    const missing = test.questions.filter(
      (q) => typeof answers[String(q.id)] !== 'number'
    )

    return (
      <div className="mx-auto max-w-2xl">
        {bar}

        <div className="bg-sand-100 rounded-[var(--radius-card)] p-6 lg:p-7">
          <h2 className="text-ink-900 text-[1rem] font-bold">{copy.reviewTitle}</h2>
          <p className="text-ink-500 mt-2 text-[0.8125rem] leading-[1.95]">
            {copy.reviewLead}
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800"
            >
              {error}
              {missing.length > 0 ? (
                <button
                  type="button"
                  onClick={() => goTo(test.questions.indexOf(missing[0]!))}
                  className="mt-2 block font-medium underline underline-offset-4"
                >
                  {copy.jumpToFirst}
                </button>
              ) : null}
            </p>
          ) : null}

          <ol className="mt-5 flex flex-col gap-1.5">
            {test.questions.map((q, position) => {
              const value = answers[String(q.id)]
              const chosen = choicesFor(test, q).find((c) => c.value === value)
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => goTo(position)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-start transition-colors',
                      chosen
                        ? 'border-line bg-white hover:border-olive-400'
                        : 'border-red-200 bg-red-50/60 hover:border-red-300'
                    )}
                  >
                    <span className="text-ink-400 mt-0.5 w-6 shrink-0 text-[0.75rem] tabular-nums">
                      {toPersianDigits(position + 1)}
                    </span>

                    {/* Stacked on a phone, side by side from `sm` up.
                        Beck's answers are whole sentences, and as a
                        `shrink-0` third column they took the width and
                        squeezed the question into a one-word ribbon that
                        then overflowed the card. */}
                    <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <span className="text-ink-700 text-[0.8125rem] leading-[1.85]">
                        {q.text}
                      </span>
                      <span
                        className={cn(
                          'text-[0.75rem] leading-[1.8] font-medium sm:w-[42%] sm:shrink-0 sm:text-end',
                          chosen ? 'text-olive-700' : 'text-red-700'
                        )}
                      >
                        {chosen ? chosen.label : copy.noAnswer}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex h-[3.25rem] items-center gap-2 rounded-full bg-olive-700 px-7 text-sm font-medium text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800 disabled:opacity-60"
            >
              {submitting ? <SpinnerIcon className="size-4 animate-spin" /> : null}
              {submitting
                ? copy.submitting
                : test.disclosesResult
                  ? copy.finish
                  : copy.finishPrivate}
            </button>
            <button
              type="button"
              onClick={() => goTo(index)}
              className="text-ink-500 hover:bg-sand-200 rounded-full px-5 py-3 text-[0.8125rem] transition-colors"
            >
              {copy.backToQuestions}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!question) return null

  const choices = choicesFor(test, question)
  const current = answers[String(question.id)]

  return (
    <div className="mx-auto max-w-2xl">
      {bar}

      <div className="bg-sand-100 rounded-[var(--radius-card)] p-6 lg:p-8">
        <p
          ref={headingRef}
          tabIndex={-1}
          className="text-ink-900 text-[1.0625rem] leading-[2] font-medium outline-none lg:text-[1.125rem]"
        >
          {question.text}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {choices.map((choice) => {
            const selected = current === choice.value
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => answer(choice.value)}
                aria-pressed={selected}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3.5 text-start text-[0.875rem] leading-[1.85] transition-colors',
                  selected
                    ? 'border-olive-600 bg-olive-50 font-medium text-olive-900'
                    : 'border-line text-ink-700 bg-white hover:border-olive-400'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
                    selected ? 'border-olive-600 bg-olive-700' : 'border-line-strong'
                  )}
                >
                  {selected ? <CheckIcon className="size-3 text-white" /> : null}
                </span>
                {choice.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {/* In RTL the previous step sits to the right, so the chevron points there. */}
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="text-ink-500 hover:bg-sand-200 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[0.8125rem] transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRightIcon className="size-4" />
          {copy.previous}
        </button>

        <span className="text-ink-400 text-[0.75rem]">
          {toPersianDigits(answered)} / {toPersianDigits(total)} {copy.answeredSoFar}
        </span>

        {index < total - 1 ? (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="text-ink-500 hover:bg-sand-200 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[0.8125rem] transition-colors"
          >
            {copy.next}
            <ChevronLeftIcon className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[0.8125rem] font-medium text-olive-700 transition-colors hover:bg-olive-50"
          >
            {copy.review}
            <ChevronLeftIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
