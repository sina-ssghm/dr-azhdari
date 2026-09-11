/**
 * Creates or resets the single admin account.
 *
 *   npm run db:seed                       # uses ADMIN_USERNAME / ADMIN_PASSWORD
 *   npm run db:seed -- 09xxxxxxxxx secret # or pass them positionally
 *
 * Safe to re-run: it upserts, so this doubles as a password reset if the
 * admin ever locks themselves out.
 *
 * Hashing mirrors `src/lib/auth.ts` exactly (scrypt, same parameters and
 * encoding) so a record written here verifies against the app.
 */
import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import pg from 'pg'

const scrypt = promisify(scryptCallback)
const PARAMS = { N: 16384, r: 8, p: 1 }
const KEYLEN = 64

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const [argUser, argPass] = process.argv.slice(2)
const username = (argUser ?? process.env.ADMIN_USERNAME ?? '').trim()
const password = argPass ?? process.env.ADMIN_PASSWORD ?? ''

if (!username || !password) {
  console.error(
    'Provide a username and password:\n' +
      '  npm run db:seed -- 09392738157 "your-password"\n' +
      'or set ADMIN_USERNAME and ADMIN_PASSWORD.'
  )
  process.exit(1)
}

const salt = randomBytes(16)
const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, PARAMS)
const hash = [
  'scrypt',
  PARAMS.N,
  PARAMS.r,
  PARAMS.p,
  salt.toString('hex'),
  key.toString('hex'),
].join('$')

const client = new pg.Client({ connectionString })
await client.connect()

await client.query(
  `insert into admin_user (username, password_hash)
   values ($1, $2)
   on conflict (username) do update
     set password_hash = excluded.password_hash, updated_at = now()`,
  [username, hash]
)

await client.end()
console.log(`Admin account ready for "${username}".`)
