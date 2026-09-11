'use client'

import { useState } from 'react'
import { deleteDiscountAction, toggleDiscountAction } from './actions'
import { DiscountForm } from './discount-form'
import { ActionButton } from '@/components/admin/action-button'
import { Modal } from '@/components/admin/modal'
import { Badge, Card, EmptyState } from '@/components/admin/ui'
import type { DiscountCode } from '@/server/discounts'
import { formatAmount, toPersianDigits } from '@/lib/utils'

export function DiscountsManager({
  services,
  discounts,
}: {
  services: readonly { id: string; title: string }[]
  discounts: DiscountCode[]
}) {
  // null = closed; 'new' = create; otherwise the code being edited.
  const [editor, setEditor] = useState<'new' | DiscountCode | null>(null)

  const titleFor = (id: string) => services.find((s) => s.id === id)?.title ?? id
  const editing = editor && editor !== 'new' ? editor : undefined

  return (
    <>
      <Card title={`کدهای موجود (${toPersianDigits(discounts.length)})`}>
        {discounts.length === 0 ? (
          <EmptyState>هنوز کد تخفیفی ثبت نشده است.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {discounts.map((discount) => {
              const expired =
                discount.expiresOn !== null &&
                discount.expiresOn < new Date().toISOString().slice(0, 10)
              const exhausted =
                discount.maxUses !== null && discount.usedCount >= discount.maxUses

              return (
                <li
                  key={discount.id}
                  className="border-line flex flex-col gap-2.5 rounded-xl border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        dir="ltr"
                        className="text-ink-900 font-mono text-[0.8125rem] font-bold"
                      >
                        {discount.code}
                      </span>
                      {discount.isActive ? (
                        <Badge tone="green">فعال</Badge>
                      ) : (
                        <Badge>غیرفعال</Badge>
                      )}
                      {expired ? <Badge tone="red">منقضی شده</Badge> : null}
                      {exhausted ? <Badge tone="amber">ظرفیت تکمیل</Badge> : null}
                    </div>

                    <p className="text-ink-400 mt-1 text-[0.6875rem] leading-relaxed">
                      {discount.kind === 'percent'
                        ? `${toPersianDigits(discount.percent ?? 0)}٪ تخفیف`
                        : `${formatAmount(discount.amountIrt ?? 0, 'IRT')} / ${formatAmount(discount.amountUsdt ?? 0, 'USDT')}`}
                      {' · '}
                      استفاده‌شده: {toPersianDigits(discount.usedCount)}
                      {discount.maxUses !== null
                        ? ` از ${toPersianDigits(discount.maxUses)}`
                        : ' (نامحدود)'}
                      {discount.expiresOn
                        ? ` · انقضا: ${toPersianDigits(discount.expiresOn)}`
                        : ''}
                      {' · '}
                      {discount.serviceIds.length === 0
                        ? 'همه خدمات'
                        : discount.serviceIds.map(titleFor).join('، ')}
                    </p>
                  </div>

                  <div className="border-line -mx-1 flex flex-wrap items-center gap-1 border-t pt-2 sm:mx-0 sm:shrink-0 sm:border-0 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => setEditor(discount)}
                      className="text-ink-500 hover:bg-sand-200 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors"
                    >
                      ویرایش
                    </button>

                    <ActionButton
                      onAction={() =>
                        toggleDiscountAction(discount.id, !discount.isActive)
                      }
                    >
                      {discount.isActive ? 'غیرفعال کن' : 'فعال کن'}
                    </ActionButton>

                    <ActionButton
                      tone="danger"
                      onAction={() => deleteDiscountAction(discount.id)}
                      confirm={{
                        title: 'حذف کد تخفیف؟',
                        body: `کد «${discount.code}» برای همیشه حذف می‌شود. اگر فقط می‌خواهید موقتاً از کار بیفتد، به‌جای حذف آن را غیرفعال کنید.`,
                        confirmLabel: 'بله، حذف کن',
                      }}
                    >
                      حذف
                    </ActionButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editing ? `ویرایش کد ${editing.code}` : 'کد تخفیف جدید'}
        description="نوع، مقدار، تاریخ انقضا، تعداد دفعات مجاز و خدمات مشمول را تعیین کنید."
      >
        {/* Remounted per target so the fields reset to the stored values. */}
        {editor !== null ? (
          <DiscountForm
            key={editing?.id ?? 'new'}
            services={services}
            editing={editing}
            onSuccess={() => setEditor(null)}
            onCancel={() => setEditor(null)}
          />
        ) : null}
      </Modal>
    </>
  )
}

/** Rendered in the page header, so the trigger sits beside the title. */
export function NewDiscountButton({
  services,
}: {
  services: readonly { id: string; title: string }[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-olive-700 px-6 text-[0.8125rem] font-medium text-white shadow-[var(--shadow-btn)] transition-colors hover:bg-olive-800"
      >
        <span aria-hidden="true" className="text-[1.05rem] leading-none">
          +
        </span>
        کد تخفیف جدید
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="کد تخفیف جدید"
        description="نوع، مقدار، تاریخ انقضا، تعداد دفعات مجاز و خدمات مشمول را تعیین کنید."
      >
        {open ? (
          <DiscountForm
            services={services}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        ) : null}
      </Modal>
    </>
  )
}
