import 'server-only'

import { getPool } from '@/lib/db'

/**
 * Testimonials, and the queue of ones waiting to be read.
 *
 * Nothing a visitor submits reaches the homepage on its own. An open comment
 * box on a therapist's site attracts spam and the occasional person in
 * distress writing something that should be answered privately rather than
 * published, so every submission waits for the practice to look at it.
 */

export type TestimonialStatus = 'pending' | 'approved' | 'rejected'

export type StoredTestimonial = {
  id: number
  name: string
  countryCode: string | null
  quote: string
  status: TestimonialStatus
  createdAt: string
}

type Row = {
  id: number
  name: string
  country_code: string | null
  quote: string
  status: TestimonialStatus
  created_at: string
}

const toTestimonial = (row: Row): StoredTestimonial => ({
  id: row.id,
  name: row.name,
  countryCode: row.country_code,
  quote: row.quote,
  status: row.status,
  createdAt: row.created_at,
})

const columns = 'id, name, country_code, quote, status, created_at'

/** What the homepage shows, oldest first so the order stays put as more arrive. */
export async function listApprovedTestimonials(): Promise<StoredTestimonial[]> {
  const { rows } = await getPool().query<Row>(
    `select ${columns} from testimonial where status = 'approved' order by id`
  )
  return rows.map(toTestimonial)
}

export const TESTIMONIAL_GROUPS = {
  pending: ['pending'],
  approved: ['approved'],
  rejected: ['rejected'],
  all: null,
} as const

export type TestimonialGroup = keyof typeof TESTIMONIAL_GROUPS

export function isTestimonialGroup(value: unknown): value is TestimonialGroup {
  return typeof value === 'string' && value in TESTIMONIAL_GROUPS
}

export async function listTestimonials(
  group: TestimonialGroup = 'pending'
): Promise<StoredTestimonial[]> {
  const statuses = TESTIMONIAL_GROUPS[group]
  const { rows } = await getPool().query<Row>(
    `select ${columns} from testimonial
      ${statuses ? 'where status = any($1)' : ''}
      order by created_at desc, id desc
      limit 300`,
    statuses ? [statuses] : []
  )
  return rows.map(toTestimonial)
}

export async function countPendingTestimonials(): Promise<number> {
  const { rows } = await getPool().query<{ n: string }>(
    `select count(*)::text as n from testimonial where status = 'pending'`
  )
  return Number(rows[0]?.n ?? 0)
}

export type NewTestimonial = {
  name: string
  countryCode: string | null
  quote: string
}

/** Records a submission. Always pending — there is no path that publishes directly. */
export async function submitTestimonial(input: NewTestimonial): Promise<void> {
  await getPool().query(
    `insert into testimonial (name, country_code, quote) values ($1, $2, $3)`,
    [input.name, input.countryCode, input.quote]
  )
}

export async function setTestimonialStatus(
  id: number,
  status: TestimonialStatus
): Promise<void> {
  await getPool().query(
    `update testimonial set status = $2, updated_at = now() where id = $1`,
    [id, status]
  )
}

/**
 * Edits the wording.
 *
 * The practice can tidy a comment before publishing it — a typo, a surname
 * somebody included by mistake — which is the ordinary business of running a
 * testimonials page.
 */
export async function updateTestimonial(
  id: number,
  input: NewTestimonial
): Promise<void> {
  await getPool().query(
    `update testimonial
        set name = $2, country_code = $3, quote = $4, updated_at = now()
      where id = $1`,
    [id, input.name, input.countryCode, input.quote]
  )
}

export async function deleteTestimonial(id: number): Promise<void> {
  await getPool().query('delete from testimonial where id = $1', [id])
}
