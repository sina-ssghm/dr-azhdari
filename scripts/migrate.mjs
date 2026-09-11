/**
 * Applies every .sql file in migrations/ in filename order, once.
 *
 *   npm run db:migrate
 *
 * Deliberately tiny: the schema is small and stable, so a migration framework
 * would be more moving parts than it saves. Each file runs inside a
 * transaction and is recorded in `_migration`, so re-running is a no-op.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add it to .env or the environment.')
  process.exit(1)
}

const dir = 'migrations'
const client = new pg.Client({ connectionString })

await client.connect()

await client.query(`
  create table if not exists _migration (
    name       text primary key,
    applied_at timestamptz not null default now()
  )
`)

const { rows } = await client.query('select name from _migration')
const applied = new Set(rows.map((r) => r.name))

const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()

let ran = 0
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip  ${file}`)
    continue
  }

  const sql = await readFile(join(dir, file), 'utf8')
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query('insert into _migration (name) values ($1)', [file])
    await client.query('commit')
    console.log(`  apply ${file}`)
    ran += 1
  } catch (error) {
    await client.query('rollback')
    console.error(`\nFailed on ${file}:\n${error.message}\n`)
    await client.end()
    process.exit(1)
  }
}

console.log(ran === 0 ? '\nAlready up to date.' : `\nApplied ${ran} migration(s).`)
await client.end()
