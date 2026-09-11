import { Pool } from 'pg'

/**
 * PostgreSQL connection pool.
 *
 * The database runs *outside* the container (native Postgres on the host, or a
 * managed instance), so the container reaches it over the network via
 * DATABASE_URL. Nothing in phase 1 reads from it yet — this exists so the
 * connection is wired, provable via /api/health, and ready for the phase-2
 * reservation flow.
 *
 * The pool is created lazily: `next build` prerenders pages without a database
 * available, so constructing it at module scope would break the build.
 */

// Reused across HMR reloads in dev so we don't leak a pool per edit.
const globalForDb = globalThis as unknown as { __pgPool?: Pool }

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  if (!globalForDb.__pgPool) {
    const pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })

    // Without this, a dropped backend connection raises an unhandled error
    // event and takes the whole Node process down.
    pool.on('error', (err) => {
      console.error('[db] idle client error', err)
    })

    globalForDb.__pgPool = pool
  }

  return globalForDb.__pgPool
}

export type DbStatus =
  { ok: true; serverVersion: string; latencyMs: number } | { ok: false; error: string }

/** Round-trips a trivial query so /api/health can report real connectivity. */
export async function checkDatabase(): Promise<DbStatus> {
  const startedAt = Date.now()
  try {
    const result = await getPool().query<{ version: string }>('select version()')
    return {
      ok: true,
      serverVersion:
        result.rows[0]?.version.split(' ').slice(0, 2).join(' ') ?? 'unknown',
      latencyMs: Date.now() - startedAt,
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
