import { checkDatabase } from '@/lib/db'

// Must run per-request against a live database, never at build time.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Diagnostic endpoint: confirms the container can reach the external
 * PostgreSQL instance. Returns 503 when the database is unreachable so
 * orchestrators can treat it as a readiness signal.
 *
 * The public site does not depend on the database in phase 1 — it keeps
 * serving normally even when this reports `degraded`.
 */
export async function GET() {
  const db = await checkDatabase()

  return Response.json(
    {
      status: db.ok ? 'ok' : 'degraded',
      app: 'up',
      db,
      timestamp: new Date().toISOString(),
    },
    {
      status: db.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
