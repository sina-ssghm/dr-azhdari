import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/app/admin/login/login-form'
import { ChevronRightIcon } from '@/components/icons'
import { admin } from '@/content/admin'
import { site } from '@/content/site'
import { getCurrentAdmin } from '@/server/session'

export const metadata: Metadata = {
  title: 'ورود به پنل مدیریت',
  robots: { index: false, follow: false },
}

// Reads cookies and the database — never prerender.
export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  // Already signed in? Skip the form.
  const existing = await getCurrentAdmin().catch(() => null)
  if (existing) redirect('/admin')

  return (
    <main className="bg-sand-200 grid min-h-dvh place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/images/profile.jpg"
            alt={site.name}
            width={96}
            height={96}
            priority
            sizes="96px"
            className="border-sand-50 size-24 rounded-full border-4 object-cover shadow-[var(--shadow-soft)]"
          />
          <h1 className="text-ink-900 mt-5 text-[1.375rem] font-bold">{admin.title}</h1>
          <p className="text-ink-400 mt-2 text-[0.8125rem]">{admin.subtitle}</p>
        </div>

        <div className="bg-sand-50 rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-soft)] lg:p-7">
          <LoginForm />
        </div>

        <Link
          href="/"
          className="text-ink-500 hover:bg-sand-100 mx-auto mt-6 flex w-fit items-center gap-2 rounded-full px-4 py-2.5 text-[0.8125rem] transition-colors hover:text-olive-700"
        >
          {/* Points right — the "back" direction in RTL. */}
          <ChevronRightIcon className="size-4" />
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </main>
  )
}
