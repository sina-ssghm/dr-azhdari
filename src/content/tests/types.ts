/**
 * The shape of a psychological questionnaire.
 *
 * One type covers all five instruments, which differ more than they look:
 * Beck gives every question its own four answers, Young uses a six-point scale
 * with no reversals, Enrich and NEO reverse some questions against different
 * maxima, and Millon is yes/no and never shows the taker their score. Rather
 * than five bespoke shapes, the differences are expressed as optional fields
 * and the scorer reads them.
 */

export type TestChoice = { label: string; value: number }

export type TestQuestion = {
  id: number
  /** For Beck this is the topic («اندوه و غمگینی»); elsewhere the statement. */
  text: string
  /** Title of the subscale this question feeds. `total` when there is only one. */
  scale: string
  /** Scored as `reverseFrom - value`. */
  reverse?: true
  /** Only where every question carries its own answers (Beck). */
  choices?: TestChoice[]
}

export type TestBand = {
  /** Inclusive upper bound. Bands are listed in ascending order. */
  upTo: number
  level: string
  message: string
}

export type TestScale = {
  key: string
  title: string
  /** Highest reachable score, so a result can be drawn as a proportion. */
  max: number
  /** Grouping heading, where the instrument has one (Young's domains). */
  domain?: string
  /** Overrides the test-wide `scaleBands` (NEO reads differently per factor). */
  bands?: TestBand[]
}

export type PsyTest = {
  id: string
  title: string
  /** Short enough for a card heading or a menu. */
  short: string
  blurb: string
  minutes: number
  /** Shared answers; `null` when every question carries its own. */
  choices: TestChoice[] | null
  /** Reversed questions score as this minus the chosen value. */
  reverseFrom?: number
  questions: TestQuestion[]
  scales: TestScale[]
  totalMax?: number
  totalBands?: TestBand[]
  /** Applied to every scale that does not carry its own bands. */
  scaleBands?: TestBand[]
  /** Scales at or above this are drawn as findings rather than measurements. */
  highlightFrom?: number
  /**
   * Whether the taker sees their scores.
   *
   * False for clinical instruments: a diagnostic label is not something to hand
   * somebody on a web page with no clinician in the room. They get an
   * acknowledgement; the therapist gets the profile.
   */
  disclosesResult: boolean
  /** Shown in place of the scores when `disclosesResult` is false. */
  privateNotice?: string
  /** Sits above the scores. */
  resultIntro?: string
  cta: string
  /**
   * An answer that matters more than the total.
   *
   * Beck's ninth question asks about self-harm; a low overall score does not
   * make a positive answer to it any less urgent.
   */
  safety?: { questionId: number; atLeast: number; message: string }
}
