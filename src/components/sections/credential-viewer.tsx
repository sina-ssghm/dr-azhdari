'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { CredentialLightbox } from './credential-lightbox'
import { DocumentIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { allCredentials } from '@/content/about'

type ViewerApi = {
  /**
   * The element that opened the viewer is handed over with the id, because
   * focus has to come back to it afterwards and `document.activeElement` is
   * not a reliable record of it — Safari does not focus a button on click, so
   * there it reads `<body>`.
   */
  open: (id: string, opener: HTMLElement) => void
}

const ViewerContext = createContext<ViewerApi | null>(null)

export function useCredentialViewer(): ViewerApi {
  const api = useContext(ViewerContext)
  if (!api) throw new Error('این کنترل باید داخل <CredentialViewer> رندر شود.')
  return api
}

/**
 * The one dialog the whole page shares, and the context that opens it.
 *
 * One viewer rather than one per section, because the licence button, the
 * three featured scans and the ten in the strip are fourteen doors into the
 * same collection: with a modal each, paging out of the licence would stop at
 * the licence.
 *
 * `children` arrives already rendered from the server component above and is
 * passed straight through, so wrapping the page in a provider does not drag
 * the page into the browser bundle — only the controls that call `open` cross
 * the boundary.
 *
 * The dialog is imported statically rather than through `next/dynamic`. The
 * testimonials strip splits its comment form out because that form searches a
 * country list derived from a phone-number library; this one pulls next/image
 * and two icons that are already in the bundle, so the split would buy nothing
 * and cost a visible pause on the first tap.
 */
export function CredentialViewer({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const opener = useRef<HTMLElement | null>(null)

  const open = useCallback((id: string, from: HTMLElement) => {
    opener.current = from
    setOpenId(id)
  }, [])

  const api = useMemo<ViewerApi>(() => ({ open }), [open])

  /**
   * Called from the dialog's own `close` event, never before it.
   *
   * The ordering is the whole point. Everything outside an open modal dialog
   * is inert, and `focus()` on an inert element is silently ignored — restore
   * focus while the dialog is still up and it lands on <body>, so a keyboard
   * user restarts from the top of a very long page. By the time `close` fires,
   * `dialog.open` is already false and the document is live again.
   *
   * The browser usually does this itself, which is why the fallback runs a
   * frame later and only when focus has actually fallen through to <body>: on
   * the normal path it looks, finds focus somewhere real and leaves it alone.
   */
  const close = useCallback(() => {
    setOpenId(null)
    const previous = opener.current
    opener.current = null
    requestAnimationFrame(() => {
      if (previous?.isConnected && document.activeElement === document.body) {
        previous.focus()
      }
    })
  }, [])

  const index = allCredentials.findIndex((item) => item.id === openId)

  return (
    <ViewerContext value={api}>
      {children}

      {index >= 0 ? (
        <CredentialLightbox index={index} onSelect={setOpenId} onClose={close} />
      ) : null}
    </ViewerContext>
  )
}

/**
 * A button elsewhere on the page that opens one particular scan.
 *
 * The licence section's «مشاهده تصویر کامل پروانه» is its only caller today.
 * It is its own island so the section around it — the heading, the paragraph
 * and the framed scan — stays a server component.
 *
 * The handler's parameter is annotated rather than inferred: `Button`'s props
 * are a union of a link and a native button, and spelling the type out is what
 * makes `currentTarget` an `HTMLButtonElement` rather than a guess.
 */
export function OpenCredentialButton({
  id,
  label,
  className,
}: {
  id: string
  label: string
  className?: string
}) {
  const { open } = useCredentialViewer()

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={className}
      aria-haspopup="dialog"
      onClick={(event: MouseEvent<HTMLButtonElement>) => open(id, event.currentTarget)}
      icon={<DocumentIcon className="size-full" strokeWidth={1.6} />}
    >
      {label}
    </Button>
  )
}
