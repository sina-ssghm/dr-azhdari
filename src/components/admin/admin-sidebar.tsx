'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CloseIcon, GlobeIcon, Icon, MenuIcon } from '@/components/icons'
import { admin, adminNav } from '@/content/admin'
import { site } from '@/content/site'
import { cn } from '@/lib/utils'

export function AdminSidebar({ signOut }: { signOut: () => Promise<void> }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Also covers back/forward, which the links' own onClick cannot.
  useEffect(() => setOpen(false), [pathname])

  // Hold the page still underneath, and let Esc dismiss.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const links = (
    <nav aria-label="منوی مدیریت">
      <ul className="flex flex-col gap-1">
        {adminNav.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-[0.8125rem] transition-colors duration-200',
                  active
                    ? 'bg-olive-700 font-semibold text-white'
                    : 'text-ink-700 hover:bg-sand-200'
                )}
              >
                <Icon
                  name={item.icon}
                  className="size-[1.1rem] shrink-0"
                  strokeWidth={1.5}
                />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )

  const footer = (
    <div className="border-line mt-6 border-t pt-4">
      {/* Opens in a new tab so the panel stays put behind it. */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink-700 hover:bg-sand-200 flex items-center gap-3 rounded-xl px-4 py-3 text-[0.8125rem] transition-colors"
      >
        <GlobeIcon className="size-[1.1rem] shrink-0" strokeWidth={1.5} />
        {admin.viewSite}
      </a>

      <form action={signOut}>
        <button
          type="submit"
          className="text-ink-500 hover:bg-sand-200 w-full rounded-xl px-4 py-3 text-start text-[0.8125rem] transition-colors hover:text-red-700"
        >
          {admin.signOut}
        </button>
      </form>
    </div>
  )

  return (
    <>
      {/* Mobile bar, with the menu hanging off it as an overlay. */}
      <div className="sticky top-0 z-40 lg:hidden">
        <div className="border-line bg-sand-50 flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/profile.jpg"
              alt={site.name}
              width={36}
              height={36}
              sizes="36px"
              className="border-sand-200 size-9 shrink-0 rounded-full border-2 object-cover"
            />
            <div>
              <p className="text-ink-900 text-[0.875rem] font-bold">{admin.title}</p>
              <p className="text-ink-400 text-[0.6875rem]">{admin.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="admin-menu"
            aria-label={open ? 'بستن منو' : 'باز کردن منو'}
            className="text-ink-700 hover:bg-sand-200 grid size-10 place-items-center rounded-full transition-colors"
          >
            {open ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>

        {/*
          Absolutely positioned inside the sticky bar rather than sitting in the
          flow after it. As an in-flow block it pushed the whole page down when
          it opened, so the scroll position landed in the middle of the menu —
          the first items were above the viewport and closing it shifted
          everything back.
        */}
        <div
          id="admin-menu"
          inert={!open}
          className={cn(
            'absolute inset-x-0 top-full',
            open ? 'pointer-events-auto' : 'pointer-events-none'
          )}
        >
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className={cn(
              'bg-ink-900/25 fixed inset-0 -z-10 transition-opacity duration-300',
              open ? 'opacity-100' : 'opacity-0'
            )}
          />
          <div
            className={cn(
              'border-line bg-sand-50 border-b p-4 shadow-[var(--shadow-lift)]',
              // Its own scrollbar, so a long menu is always reachable on a
              // short screen instead of running off the bottom.
              'max-h-[calc(100dvh-4.25rem)] overflow-y-auto',
              'origin-top transition-all duration-300 ease-[var(--ease-out-soft)]',
              open ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
            )}
          >
            {links}
            {footer}
          </div>
        </div>
      </div>

      {/* Desktop rail — inline-start, which is the right-hand side in RTL. */}
      <aside className="border-line bg-sand-50 hidden w-[16rem] shrink-0 border-s p-6 lg:sticky lg:top-0 lg:block lg:h-dvh">
        <div className="mb-8 flex items-center gap-3">
          {/* Avatar sits at the inline start — the right-hand edge in RTL. */}
          <Image
            src="/images/profile.jpg"
            alt={site.name}
            width={44}
            height={44}
            sizes="44px"
            className="border-sand-200 size-11 shrink-0 rounded-full border-2 object-cover"
          />
          <div className="min-w-0">
            <p className="text-ink-900 text-[0.9375rem] font-bold">{admin.title}</p>
            <p className="text-ink-400 mt-0.5 truncate text-[0.75rem]">
              {admin.subtitle}
            </p>
          </div>
        </div>
        {links}
        {footer}
      </aside>
    </>
  )
}
