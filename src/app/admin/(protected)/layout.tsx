import type { Metadata } from 'next'
import { logoutAction } from '@/app/admin/actions'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { requireAdmin } from '@/server/session'

export const metadata: Metadata = {
  title: { default: 'پنل مدیریت', template: '%s | پنل مدیریت' },
  robots: { index: false, follow: false, nocache: true },
}

// Every admin page reads cookies and the database.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Guards the whole group in one place — no page can be reached unauthenticated.
  await requireAdmin()

  return (
    <div className="bg-sand-200 flex min-h-dvh flex-col lg:flex-row">
      <AdminSidebar signOut={logoutAction} />
      <main className="min-w-0 flex-1 px-5 py-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  )
}
