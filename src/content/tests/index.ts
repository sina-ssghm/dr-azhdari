/**
 * The questionnaires the practice offers.
 *
 * The questions live in code rather than the database: they are editorial
 * content that changes only when the therapist revises an instrument, and
 * keeping them here means scoring and wording can never drift apart. Only the
 * prices — which the practice edits — are stored.
 */
import type { PsyTest } from './types'
import { bdi2 } from './bdi2'
import { enrich } from './enrich'
import { ysqS3 } from './ysq_s3'
import { neoFfi } from './neo_ffi'
import { mcmi } from './mcmi'

export * from './types'

/** Presentation order on the public list. */
export const TESTS: readonly PsyTest[] = [bdi2, enrich, ysqS3, neoFfi, mcmi]

export const TEST_IDS = TESTS.map((test) => test.id)

export function findTest(id: string): PsyTest | undefined {
  return TESTS.find((test) => test.id === id)
}
