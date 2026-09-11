'use client'

import { useState } from 'react'
import { AppointmentForm } from './appointment-form'
import { Modal } from '@/components/admin/modal'

export function NewAppointmentButton({
  services,
}: {
  services: readonly { id: string; title: string; durations: readonly number[] }[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-olive-700 px-6 text-[0.8125rem] font-medium text-white shadow-[var(--shadow-btn)] transition-all duration-300 ease-[var(--ease-out-soft)] hover:bg-olive-800"
      >
        <span aria-hidden="true" className="text-[1.05rem] leading-none">
          +
        </span>
        ثبت نوبت جدید
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="ثبت نوبت جدید"
        description="نوبت‌هایی که از این فرم ثبت می‌شوند تأییدشده و بدون پرداخت در نظر گرفته می‌شوند."
      >
        {/* Remounting on each open clears the previous entry and any error. */}
        {open ? (
          <AppointmentForm services={services} onSuccess={() => setOpen(false)} />
        ) : null}
      </Modal>
    </>
  )
}
