'use client'

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * Fades content up as it scrolls into view.
 *
 * Uses a plain IntersectionObserver instead of an animation library — the
 * whole effect is ~20 lines of JS plus a CSS transition, which keeps the
 * page weight down on the slower connections most visitors will be on.
 * The CSS in globals.css short-circuits this entirely under
 * `prefers-reduced-motion`, and `.no-js` guarantees content is visible if
 * scripting never runs.
 */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className,
  children,
}: {
  as?: ElementType
  /** Stagger, in milliseconds. */
  delay?: number
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const show = () => {
      node.dataset.reveal = 'shown'
    }

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      show()
      return
    }

    /**
     * Anything already on screen at mount plays immediately rather than
     * waiting to be scrolled into view — otherwise content that is visible
     * on load (or only partly visible, which the observer's threshold would
     * ignore) sits invisible until the visitor happens to scroll.
     * Deferring one frame lets the CSS transition actually run.
     */
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    if (node.getBoundingClientRect().top < viewportHeight) {
      const frame = requestAnimationFrame(show)
      return () => cancelAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show()
            observer.disconnect()
          }
        }
      },
      // Fire as soon as the element edges into view — a high threshold makes
      // tall blocks feel like they reveal late.
      { threshold: 0, rootMargin: '0px 0px -6% 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      data-reveal=""
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
      className={cn(className)}
    >
      {children}
    </Tag>
  )
}
