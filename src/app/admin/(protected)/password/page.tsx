import type { Metadata } from 'next'
import { PasswordForm } from './password-form'
import { PageHeader } from '@/components/admin/ui'
import { requireAdmin } from '@/server/session'

export const metadata: Metadata = { title: 'تغییر رمز عبور' }
export const dynamic = 'force-dynamic'

export default async function PasswordPage() {
  const user = await requireAdmin()

  return (
    <>
      <PageHeader
        title="تغییر رمز عبور"
        description={`نام کاربری شما: ${user.username}`}
      />
      <div className="max-w-md">
        <PasswordForm />
      </div>
    </>
  )
}
