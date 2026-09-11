import 'server-only'

import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto'
import { promisify } from 'node:util'

// promisify picks the 3-argument overload, so restate the signature we use.
const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>

/* ------------------------------------------------------------------ *
 * Password hashing
 *
 * scrypt from node:crypto rather than bcrypt/argon2 — it is memory-hard,
 * built in, and needs no native module in the Alpine container.
 * Format: scrypt$N$r$p$<salt-hex>$<hash-hex>
 * ------------------------------------------------------------------ */

const KEYLEN = 64
const PARAMS = { N: 16384, r: 8, p: 1 }

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, PARAMS)
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('hex'),
    key.toString('hex'),
  ].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, n, r, p, saltHex, hashHex] = parts
  if (!n || !r || !p || !saltHex || !hashHex) return false

  const expected = Buffer.from(hashHex, 'hex')
  const key = await scrypt(
    password.normalize('NFKC'),
    Buffer.from(saltHex, 'hex'),
    expected.length,
    { N: Number(n), r: Number(r), p: Number(p) }
  )

  // Constant-time: a length check first, since timingSafeEqual throws on mismatch.
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/* ------------------------------------------------------------------ *
 * Session tokens
 *
 * A signed, self-contained token in an httpOnly cookie. No session table:
 * one admin user and no need for server-side revocation beyond rotating
 * SESSION_SECRET (which a password change also effectively does, because the
 * token embeds a fingerprint of the current password hash).
 * ------------------------------------------------------------------ */

export const SESSION_COOKIE = 'dr_admin_session'
/**
 * A week. The panel is used from a phone throughout the day and signing back
 * in twice a day was the main friction; the token still dies the moment the
 * password changes, which is the control that actually matters.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function secret(): string {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or shorter than 32 characters. Generate one with: openssl rand -hex 32'
    )
  }
  return value
}

const base64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export type SessionPayload = {
  /** Admin user id. */
  sub: number
  /** Fingerprint of the password hash — changing the password kills old sessions. */
  fp: string
  /** Unix seconds. */
  exp: number
}

/** Short fingerprint of the stored hash, so a password change invalidates tokens. */
export function fingerprint(passwordHash: string): string {
  return createHmac('sha256', secret())
    .update(passwordHash)
    .digest('base64url')
    .slice(0, 16)
}

export function createSessionToken(sub: number, passwordHash: string): string {
  const payload: SessionPayload = {
    sub,
    fp: fingerprint(passwordHash),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  }
  const body = base64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

export function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null

  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  const expected = sign(body)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString()
    ) as SessionPayload
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
