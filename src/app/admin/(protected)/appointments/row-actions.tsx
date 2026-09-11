'use client'

import { useState } from 'react'
import {
  confirmPaymentAction,
  deleteAppointmentAction,
  rejectPaymentAction,
  setStatusAction,
} from './actions'
import { AppointmentForm } from './appointment-form'
import { ActionButton } from '@/components/admin/action-button'
import { Modal } from '@/components/admin/modal'
import { OverflowMenu } from '@/components/admin/overflow-menu'
import type { Appointment } from '@/server/appointments'

/** Menu entries are full-width rows, not the pills used along the row. */
const MENU_ITEM = 'w-full justify-start rounded-lg px-3 py-2'

const PAYMENT_STATE: Record<string, string> = {
  unpaid: 'پرداخت‌نشده',
  pending_review: 'در انتظار بررسی رسید',
  paid: 'پرداخت‌شده',
  waived: 'بدون پرداخت',
}

/**
 * Client boundary for a row's actions. Server components cannot hand a
 * closure to <ActionButton>, so the bindings are made here.
 *
 * Only three actions sit on the row — the receipt, and the two destructive
 * ones. Everything else is behind the overflow menu: eight buttons of equal
 * weight made the important ones hard to pick out.
 */
export function RowActions({
  appointment,
  services,
}: {
  appointment: Appointment
  services: readonly { id: string; title: string; durations: readonly number[] }[]
}) {
  const [editing, setEditing] = useState(false)
  const [showingReceipt, setShowingReceipt] = useState(false)

  const { id, status, fullName, paymentStatus, receiptPath, bookingRef } = appointment
  const awaitingPayment = paymentStatus === 'pending_review'
  const receiptUrl = receiptPath ? `/admin/receipts/${receiptPath}` : null
  const isPdf = receiptPath?.toLowerCase().endsWith('.pdf') ?? false

  const canConfirm = status !== 'confirmed' && status !== 'completed'
  const canComplete = status !== 'completed' && status !== 'cancelled'

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {receiptUrl ? (
        <button
          type="button"
          onClick={() => setShowingReceipt(true)}
          className={
            'rounded-full px-3 py-1.5 text-[0.75rem] transition-colors ' +
            (awaitingPayment
              ? 'bg-amber-100 font-medium text-amber-900 hover:bg-amber-200'
              : 'text-ink-500 hover:bg-sand-200')
          }
        >
          مشاهده رسید
        </button>
      ) : null}

      {status !== 'cancelled' ? (
        <ActionButton
          onAction={() => setStatusAction(id, 'cancelled')}
          confirm={{
            title: 'لغو نوبت؟',
            body: `نوبت «${fullName}» لغو می‌شود و ساعت آن دوباره برای رزرو آزاد خواهد شد.`,
            confirmLabel: 'لغو نوبت',
          }}
        >
          لغو
        </ActionButton>
      ) : null}

      <ActionButton
        tone="danger"
        onAction={() => deleteAppointmentAction(id)}
        confirm={{
          title: 'حذف نوبت؟',
          body: `نوبت «${fullName}» برای همیشه حذف می‌شود. این کار قابل بازگشت نیست — اگر فقط می‌خواهید نوبت برگزار نشود، به‌جای حذف آن را لغو کنید.`,
          confirmLabel: 'بله، حذف کن',
        }}
      >
        حذف
      </ActionButton>

      <OverflowMenu>
        {/* A plain button, not <ActionButton>: this opens a dialog rather than
            calling the server, so a pending spinner would be misleading. */}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`text-ink-700 hover:bg-sand-200 inline-flex items-center text-[0.75rem] transition-colors ${MENU_ITEM}`}
        >
          ویرایش
        </button>

        {canConfirm ? (
          <ActionButton
            tone="positive"
            onAction={() => setStatusAction(id, 'confirmed')}
            className={MENU_ITEM}
          >
            تأیید
          </ActionButton>
        ) : null}

        {canComplete ? (
          <ActionButton
            tone="positive"
            onAction={() => setStatusAction(id, 'completed')}
            className={MENU_ITEM}
          >
            انجام شد
          </ActionButton>
        ) : null}
      </OverflowMenu>

      {receiptUrl ? (
        <Modal
          open={showingReceipt}
          onClose={() => setShowingReceipt(false)}
          title="رسید پرداخت"
          description={`ارسال‌شده برای «${fullName}»`}
        >
          <div className="border-line grid max-h-[60vh] place-items-center overflow-auto rounded-xl border bg-white p-2">
            {isPdf ? (
              <object
                data={receiptUrl}
                type="application/pdf"
                className="h-[58vh] w-full"
              >
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-olive-700 underline"
                >
                  این رسید PDF است — برای دیدن آن اینجا کلیک کنید.
                </a>
              </object>
            ) : (
              // Not next/image: the route requires an admin session, so it
              // cannot be fetched by the image optimiser.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={receiptUrl}
                alt={`رسید پرداخت ${fullName}`}
                className="max-h-[56vh] w-auto object-contain"
              />
            )}
          </div>

          <p className="text-ink-500 mt-4 text-[0.75rem]">
            وضعیت فعلی پرداخت:{' '}
            <b className="text-ink-900">
              {PAYMENT_STATE[paymentStatus] ?? paymentStatus}
            </b>
          </p>

          {/* Both decisions stay available whatever the current state — a
              receipt rejected by mistake has to be recoverable, and the row
              itself no longer carries these buttons. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ActionButton
              tone="positive"
              onAction={async () => {
                const failure = await confirmPaymentAction(bookingRef)
                if (!failure) setShowingReceipt(false)
                return failure
              }}
              className="border border-olive-600 px-5 py-2 text-olive-800 hover:bg-olive-50"
            >
              تأیید پرداخت
            </ActionButton>

            <ActionButton
              onAction={async () => {
                const failure = await rejectPaymentAction(bookingRef)
                if (!failure) setShowingReceipt(false)
                return failure
              }}
              className="border-line hover:bg-sand-200 border px-5 py-2"
            >
              رد رسید
            </ActionButton>

            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-400 hover:text-ink-900 ms-auto text-[0.75rem] underline transition-colors"
            >
              باز کردن در تب جدید
            </a>
          </div>
        </Modal>
      ) : null}

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="ویرایش نوبت"
        description="تغییر نوع مشاوره، زمان یا اطلاعات تماس. وضعیت نوبت از دکمه‌های همان ردیف تغییر می‌کند."
      >
        {/* Remounted each time so the fields reset to the stored values. */}
        {editing ? (
          <AppointmentForm
            services={services}
            appointment={appointment}
            onSuccess={() => setEditing(false)}
          />
        ) : null}
      </Modal>
    </div>
  )
}
