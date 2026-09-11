import type { PsyTest, TestBand, TestQuestion } from '@/content/tests'

/**
 * Scoring for all five questionnaires.
 *
 * Deliberately pure and shared: the taker's result page, the admin's copy and
 * the row written to the database all come from this one function, so there is
 * no way for the score somebody is shown to differ from the score their
 * therapist reads.
 */

/** Question id (as a string, because it arrives as JSON) to chosen value. */
export type Answers = Record<string, number>

export type ScaleResult = {
  key: string
  title: string
  domain?: string
  score: number
  max: number
  /** Proportion of the maximum, for the bar. */
  ratio: number
  level?: string
  message?: string
  /** Whether this scale is a finding rather than just a measurement. */
  flagged?: boolean
}

export type TestResult = {
  total: number
  totalMax: number
  level?: string
  message?: string
  scales: ScaleResult[]
  /** Set when an individual answer needs saying regardless of the total. */
  safety?: string
  answered: number
  questionCount: number
}

/** The answers a question offers — its own, or the test's shared set. */
export function choicesFor(test: PsyTest, question: TestQuestion) {
  return question.choices ?? test.choices ?? []
}

/**
 * What one answer contributes.
 *
 * A reversed question is scored as `reverseFrom - value`, which is why the
 * constant lives on the test: Enrich reverses against 6 and NEO against 4.
 */
function contribution(test: PsyTest, question: TestQuestion, value: number): number {
  if (!question.reverse || test.reverseFrom === undefined) return value
  return test.reverseFrom - value
}

function bandFor(bands: readonly TestBand[] | undefined, score: number) {
  // Ascending bounds, so the first one the score fits is the right one; the
  // last is a backstop for a score at the very top of the range.
  return bands?.find((band) => score <= band.upTo) ?? bands?.[bands.length - 1]
}

export function isAnswered(answers: Answers, question: TestQuestion): boolean {
  return typeof answers[String(question.id)] === 'number'
}

export function countAnswered(test: PsyTest, answers: Answers): number {
  return test.questions.filter((question) => isAnswered(answers, question)).length
}

export function firstUnanswered(test: PsyTest, answers: Answers): number {
  const index = test.questions.findIndex((question) => !isAnswered(answers, question))
  return index === -1 ? 0 : index
}

export function scoreTest(test: PsyTest, answers: Answers): TestResult {
  let total = 0
  const perScale = new Map<string, number>()

  for (const question of test.questions) {
    const raw = answers[String(question.id)]
    if (typeof raw !== 'number') continue
    const value = contribution(test, question, raw)
    total += value
    perScale.set(question.scale, (perScale.get(question.scale) ?? 0) + value)
  }

  const scales: ScaleResult[] = test.scales.map((scale) => {
    const score = perScale.get(scale.title) ?? 0
    const band = bandFor(scale.bands ?? test.scaleBands, score)
    return {
      key: scale.key,
      title: scale.title,
      ...(scale.domain ? { domain: scale.domain } : {}),
      score,
      max: scale.max,
      ratio: scale.max > 0 ? score / scale.max : 0,
      ...(band ? { level: band.level, message: band.message } : {}),
      ...(test.highlightFrom !== undefined && score >= test.highlightFrom
        ? { flagged: true }
        : {}),
    }
  })

  // A test with no declared total (NEO, Millon) is summarised by its scales,
  // so the sum is reported only for completeness.
  const totalMax = test.totalMax ?? test.scales.reduce((sum, scale) => sum + scale.max, 0)
  const band = bandFor(test.totalBands, total)

  const safety = test.safety
  const safetyAnswer = safety ? answers[String(safety.questionId)] : undefined

  return {
    total,
    totalMax,
    ...(band && test.totalBands ? { level: band.level, message: band.message } : {}),
    scales,
    ...(safety && typeof safetyAnswer === 'number' && safetyAnswer >= safety.atLeast
      ? { safety: safety.message }
      : {}),
    answered: countAnswered(test, answers),
    questionCount: test.questions.length,
  }
}

/** Rejects anything that is not a real answer to a real question. */
export function sanitiseAnswers(test: PsyTest, input: unknown): Answers {
  if (typeof input !== 'object' || input === null) return {}
  const allowed = new Map(
    test.questions.map((question) => [
      String(question.id),
      new Set(choicesFor(test, question).map((choice) => choice.value)),
    ])
  )

  const out: Answers = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const values = allowed.get(key)
    if (values && typeof value === 'number' && values.has(value)) out[key] = value
  }
  return out
}
