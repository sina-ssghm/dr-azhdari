'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CalendarIcon, CloseIcon, MenuIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { cta, nav, site } from '@/content/site'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Tighten the floating bar once the hero starts scrolling away.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the drawer on route change.
  useEffect(() => setMenuOpen(false), [pathname])

  // Lock body scroll and allow Esc to dismiss while the drawer is open.
  useEffect(() => {
    if (!menuOpen) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[padding] duration-500 ease-[var(--ease-out-soft)]',
        // Transparent does not mean tap-through. The header's box covers its
        // own padding *and* the collapsed mobile drawer below it — several
        // hundred pixels of invisible area that would otherwise swallow every
        // tap aimed at the content beneath. Only the parts that are actually
        // visible switch pointer events back on.
        'pointer-events-none',
        scrolled ? 'py-3' : 'py-5 lg:py-6'
      )}
    >
      <Container className="pointer-events-none flex items-center gap-3 lg:gap-4">
        {/* Booking CTA sits at the inline start — the right-hand corner in
            RTL — exactly as in the design. */}
        <Button
          href={cta.bookHref}
          size="sm"
          icon={<CalendarIcon className="size-full" />}
          className="pointer-events-auto hidden shrink-0 lg:inline-flex lg:h-[3.5rem] lg:px-7 lg:text-sm"
        >
          {cta.book}
        </Button>

        {/* Nav pill — grows to fill the rest of the row; the links themselves
            sit at the pill's inline start, so they end up adjacent to the CTA
            with the empty pill space trailing off to the left. */}
        <div
          className={cn(
            // Taller on mobile than desktop: the brand stacks over the role there.
            'pointer-events-auto flex h-[3.75rem] flex-1 items-center rounded-full border border-white/70 bg-white/85 px-2.5',
            'backdrop-blur-xl transition-shadow duration-500 ease-[var(--ease-out-soft)] lg:h-[3.5rem] lg:px-3',
            scrolled ? 'shadow-[var(--shadow-nav)]' : 'shadow-[var(--shadow-soft)]'
          )}
        >
          <nav aria-label="ناوبری اصلی" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {nav.map((item) => {
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative block rounded-full px-4 py-2.5 text-[0.875rem] transition-colors duration-300',
                        active
                          ? 'text-ink-900 font-semibold'
                          : 'text-ink-500 hover:text-olive-700'
                      )}
                    >
                      {item.label}
                      <span
                        className={cn(
                          'absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-olive-600 transition-all duration-300 ease-[var(--ease-out-soft)]',
                          active ? 'opacity-100' : 'scale-x-0 opacity-0'
                        )}
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Mobile: brand + trigger */}
          <div className="flex w-full items-center justify-between lg:hidden">
            <Link href="/" className="flex flex-col ps-3">
              <span className="text-ink-900 text-[0.9375rem] leading-tight font-semibold">
                {site.name}
              </span>
              <span className="text-ink-400 mt-0.5 text-[0.6875rem] leading-tight">
                {site.role}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
              className="text-ink-700 hover:bg-sand-200 grid size-10 place-items-center rounded-full transition-colors"
            >
              {menuOpen ? (
                <CloseIcon className="size-5" />
              ) : (
                <MenuIcon className="size-5" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        // Closed, the panel is only faded out — still laid out, still
        // focusable. `inert` takes it out of the focus order and the
        // accessibility tree, so Tab does not disappear into an invisible menu.
        inert={!menuOpen}
        className={cn(
          'lg:hidden',
          menuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <div
          onClick={() => setMenuOpen(false)}
          className={cn(
            'bg-ink-900/25 fixed inset-0 -z-10 backdrop-blur-[2px] transition-opacity duration-300',
            menuOpen ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden="true"
        />
        <Container>
          <div
            className={cn(
              'mt-3 origin-top rounded-[1.5rem] border border-white/70 bg-white/95 p-3 shadow-[var(--shadow-nav)] backdrop-blur-xl',
              'transition-all duration-300 ease-[var(--ease-out-soft)]',
              menuOpen
                ? 'translate-y-0 scale-100 opacity-100'
                : '-translate-y-2 scale-[0.98] opacity-0'
            )}
          >
            <nav aria-label="ناوبری موبایل">
              <ul className="flex flex-col">
                {nav.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'block rounded-2xl px-4 py-3 text-[0.9375rem] transition-colors',
                          active
                            ? 'bg-olive-50 font-semibold text-olive-800'
                            : 'text-ink-700 hover:bg-sand-100'
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
            <Button
              href={cta.bookHref}
              size="md"
              icon={<CalendarIcon className="size-full" />}
              className="mt-2 w-full"
            >
              {cta.book}
            </Button>
          </div>
        </Container>
      </div>
    </header>
  )
}
