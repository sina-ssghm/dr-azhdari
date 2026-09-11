import 'server-only'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  fingerprint,
  readSessionToken,
} from '@/lib/auth'
import { getPool } from '@/lib/db'

export type AdminUser = {
  id: number
  username: string
  passwordHash: string
}

export async function findAdminByUsername(username: string): Promise<AdminUser | null> {
  const { rows } = await getPool().query<{
    id: number
    username: string
    password_hash: string
  }>('select id, username, password_hash from admin_user where username = $1', [username])

  const row = rows[0]
  return row
    ? { id: row.id, username: row.username, passwordHash: row.password_hash }
    : null
}

async function findAdminById(id: number): Promise<AdminUser | null> {
  const { rows } = await getPool().query<{
    id: number
    username: string
    password_hash: string
  }>('select id, username, password_hash from admin_user where id = $1', [id])

  const row = rows[0]
  return row
    ? { id: row.id, username: row.username, passwordHash: row.password_hash }
    : null
}

/**
 * Whether the *browser* reached us over HTTPS.
 *
 * Not `NODE_ENV`: the production container is always behind a proxy and only
 * ever receives plain HTTP, so keying `secure` off the build mode marks the
 * cookie Secure even when the visitor is on `http://localhost:3100` — where
 * Chrome then withholds it from Server Action POSTs and every mutation
 * silently 'logs you out'. Cloudflare and nginx both set x-forwarded-proto.
 */
async function isHttpsRequest(): Promise<boolean> {
  const proto = (await headers()).get('x-forwarded-proto')
  return proto?.split(',')[0]?.trim() === 'https'
}

export async function startSession(user: AdminUser): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, createSessionToken(user.id, user.passwordHash), {
    httpOnly: true,
    sameSite: 'lax',
    secure: await isHttpsRequest(),
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/**
 * Resolves the signed-in admin, or null.
 *
 * The token carries a fingerprint of the password hash, so changing the
 * password invalidates every previously issued token — including any that
 * leaked. This is the check that makes that work.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const store = await cookies()
  const payload = readSessionToken(store.get(SESSION_COOKIE)?.value)
  if (!payload) return null

  const user = await findAdminById(payload.sub)
  if (!user) return null
  if (payload.fp !== fingerprint(user.passwordHash)) return null

  return user
}

/** Use at the top of every protected page and server action. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getCurrentAdmin()
  if (!user) redirect('/admin/login')
  return user
}
