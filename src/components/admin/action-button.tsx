'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/admin/modal'
import { SpinnerIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'positive' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'text-ink-500 hover:bg-sand-200',
  positive: 'text-olive-700 hover:bg-sand-200',
  danger: 'text-ink-400 hover:bg-red-50 hover:text-red-700',
}

/**
 * A row action that calls a server action directly (no wrapping <form>), so it
 * can own its own pending state and optionally confirm first.
 *
 * `useFormStatus` would only report pending for the *nearest* form, which in a
 * list of rows means every button in that row spins at once — hence
 * `useTransition` per button instead.
 */
export function ActionButton({
  children,
  onAction,
  tone = 'neutral',
  confirm,
  disabled = false,
  className,
}: {
  children: React.ReactNode
  /**
   * Returning a string reports a failure the admin needs to see — reviving a
   * cancelled appointment onto a time that has since been taken, say. These
   * actions write to the database, so "it silently did nothing" is the one
   * outcome that must not be possible.
   */
  onAction: () => Promise<string | void>
  tone?: Tone
  /** Omit for immediate actions; provide to require confirmation first. */
  confirm?: { title: string; body: string; confirmLabel: string }
  /** For an action that exists but has nothing to do — the first row's "move up". */
  disabled?: boolean
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const [asking, setAsking] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const run = () => {
    setAsking(false)
    startTransition(async () => {
      setFailure((await onAction()) || null)
    })
  }

  return (
    <>
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => (confirm ? setAsking(true) : run())}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors',
          'disabled:pointer-events-none disabled:opacity-60',
          tones[tone],
          className
        )}
      >
        {pending ? <SpinnerIcon className="size-3.5 animate-spin" /> : null}
        {children}
      </button>

      {confirm ? (
        <Modal
          open={asking}
          onClose={() => setAsking(false)}
          title={confirm.title}
          description={confirm.body}
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={run}
              className="inline-flex h-11 items-center justify-center rounded-full bg-red-600 px-6 text-[0.8125rem] font-medium text-white transition-colors hover:bg-red-700"
            >
              {confirm.confirmLabel}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="text-ink-500 hover:bg-sand-200 h-11 rounded-full px-5 text-[0.8125rem] transition-colors"
            >
              انصراف
            </button>
          </div>
        </Modal>
      ) : null}

      <Modal
        open={failure !== null}
        onClose={() => setFailure(null)}
        title="انجام نشد"
        description={failure ?? ''}
      >
        <button
          type="button"
          onClick={() => setFailure(null)}
          className="text-ink-500 hover:bg-sand-200 h-11 rounded-full px-5 text-[0.8125rem] transition-colors"
        >
          بستن
        </button>
      </Modal>
    </>
  )
}
