'use client'

import { useState } from 'react'
import Image from 'next/image'
import { approveOrderAction, deleteOrderAction, rejectOrderAction } from './actions'
import { ActionButton } from '@/components/admin/action-button'
import { Modal } from '@/components/admin/modal'
import { OverflowMenu } from '@/components/admin/overflow-menu'
import { Badge } from '@/components/admin/ui'
import type { PsyTest } from '@/content/tests'
import type { TestOrder } from '@/server/tests'
import { choicesFor, type Answers, type TestResult } from '@/lib/test-scoring'
import { formatPrice, toPersianDigits } from '@/lib/utils'

const statusLabels = {
  unpaid: { label: 'در انتظار پرداخت', tone: 'neutral' },
  pending_review: { label: 'رسید در انتظار بررسی', tone: 'amber' },
  paid: { label: 'پرداخت تأیید شد', tone: 'green' },
  rejected: { label: 'رد شده', tone: 'red' },
} as const

/** The private link, absolute, so it can be pasted straight into a messenger. */
function testLink(token: string) {
  if (typeof window === 'undefined') return `/t/${token}`
  return `${window.location.origin}/t/${token}`
}

function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(testLink(token))
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // Clipboard can be blocked; the link is selectable in the dialog.
        }
      }}
      className="rounded-full bg-olive-700 px-4 py-2 text-[0.75rem] font-medium text-white transition-colors hover:bg-olive-800"
    >
      {copied ? 'کپی شد' : 'کپی لینک آزمون'}
    </button>
  )
}

function ResultTable({
  test,
  result,
  answers,
}: {
  test: PsyTest
  result: TestResult
  answers: Answers
}) {
  return (
    <div className="flex flex-col gap-4">
      {result.safety ? (
        <p className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-[0.8125rem] leading-[1.95] font-medium text-red-900">
          ⚠️ پاسخ به سؤال ایمنی مثبت بود — {result.safety}
        </p>
      ) : null}

      {test.totalBands ? (
        <div className="border-line rounded-xl border bg-white p-4">
          <p className="text-ink-400 text-[0.75rem]">نمره کل</p>
          <p className="text-ink-900 mt-1 text-[1.25rem] font-bold tabular-nums">
            {toPersianDigits(result.total)} از {toPersianDigits(result.totalMax)}
          </p>
          {result.level ? (
            <p className="mt-2 text-[0.875rem] font-bold text-olive-700">
              {result.level}
            </p>
          ) : null}
        </div>
      ) : null}

      {result.scales.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {result.scales.map((scale) => (
            <li
              key={scale.key}
              className="border-line flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-2.5"
            >
              <span className="text-ink-700 min-w-0 text-[0.8125rem]">
                {scale.title}
                {scale.level ? (
                  <span className="text-ink-400"> — {scale.level}</span>
                ) : null}
              </span>
              <span className="text-ink-900 shrink-0 text-[0.8125rem] font-bold tabular-nums">
                {toPersianDigits(scale.score)} / {toPersianDigits(scale.max)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* The therapist reads the individual answers, not just the totals —
          a single item can matter more than the scale it sits in. */}
      <details className="border-line rounded-xl border bg-white p-4">
        <summary className="text-ink-500 cursor-pointer text-[0.8125rem]">
          ریز پاسخ‌ها
        </summary>
        <ol className="mt-3 flex flex-col gap-2">
          {test.questions.map((question, index) => {
            const value = answers[String(question.id)]
            const chosen = choicesFor(test, question).find((c) => c.value === value)
            return (
              <li
                key={question.id}
                // Same reason as the review step: an answer that is a whole
                // sentence cannot be a `shrink-0` column beside the question.
                className="border-line flex flex-col gap-1 border-b pb-2 text-[0.75rem] leading-[1.8] last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <span className="text-ink-700 min-w-0">
                  <span className="text-ink-400 tabular-nums">
                    {toPersianDigits(index + 1)}.{' '}
                  </span>
                  {question.text}
                </span>
                <span className="text-ink-900 font-medium sm:w-[40%] sm:shrink-0 sm:text-end">
                  {chosen ? chosen.label : '—'}
                  {typeof value === 'number' ? (
                    <span className="text-ink-400 font-normal">
                      {' '}
                      ({toPersianDigits(value)})
                    </span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ol>
      </details>
    </div>
  )
}

export function TestOrderRow({
  order,
  test,
}: {
  order: TestOrder
  test: PsyTest | undefined
}) {
  const [showReceipt, setShowReceipt] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [showLink, setShowLink] = useState(false)

  const status = statusLabels[order.paymentStatus]
  const done = Boolean(order.completedAt)

  return (
    <li className="border-line rounded-xl border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-ink-900 text-[0.875rem] font-medium">
            {order.fullName}
            <span className="text-ink-400 font-normal">
              {' '}
              — {test?.short ?? order.testId}
            </span>
          </p>
          <p className="text-ink-400 mt-1.5 text-[0.75rem]">
            <span dir="ltr">{order.phone}</span>
            {' · '}
            {formatPrice(order.amount, order.currency)}
            {' · '}
            {order.region === 'iran' ? 'داخل ایران' : 'خارج از ایران'}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          {/* A clinical screening is the one result nobody else has seen: the
              taker got an acknowledgement and no scores, so if this row is not
              opened the profile goes unread. It gets its own colour rather
              than the same green "done" as a self-knowledge test. */}
          {done && test && !test.disclosesResult ? (
            <Badge tone="amber">گزارش بالینی — نیاز به بررسی شما</Badge>
          ) : done ? (
            <Badge tone="green">آزمون انجام شد</Badge>
          ) : null}
        </div>
      </div>

      <div className="border-line flex flex-wrap items-center gap-1 border-t px-3 py-2">
        {order.receiptPath ? (
          <button
            type="button"
            onClick={() => setShowReceipt(true)}
            className="text-ink-500 hover:bg-sand-200 rounded-full px-3 py-1.5 text-[0.75rem] transition-colors"
          >
            مشاهده رسید
          </button>
        ) : null}

        {done && order.result ? (
          <button
            type="button"
            onClick={() => setShowResult(true)}
            className="hover:bg-sand-200 rounded-full px-3 py-1.5 text-[0.75rem] font-medium text-olive-700 transition-colors"
          >
            مشاهده نتیجه
          </button>
        ) : null}

        {order.accessToken ? (
          <button
            type="button"
            onClick={() => setShowLink(true)}
            className="hover:bg-sand-200 rounded-full px-3 py-1.5 text-[0.75rem] font-medium text-olive-700 transition-colors"
          >
            لینک آزمون
          </button>
        ) : null}

        {order.paymentStatus !== 'paid' ? (
          <ActionButton
            tone="positive"
            onAction={async () => {
              await approveOrderAction(order.orderRef)
            }}
          >
            تأیید پرداخت
          </ActionButton>
        ) : null}

        <OverflowMenu>
          {order.paymentStatus !== 'rejected' && !done ? (
            <ActionButton
              tone="danger"
              onAction={() => rejectOrderAction(order.orderRef)}
              confirm={{
                title: 'رد پرداخت',
                body: 'لینک آزمون این مراجع باطل می‌شود و دیگر کار نمی‌کند. مطمئن هستید؟',
                confirmLabel: 'رد کن',
              }}
            >
              رد پرداخت
            </ActionButton>
          ) : null}
          <ActionButton
            tone="danger"
            onAction={() => deleteOrderAction(order.orderRef)}
            confirm={{
              title: 'حذف سفارش',
              body: 'این سفارش و پاسخ‌های ثبت‌شده آن برای همیشه حذف می‌شود.',
              confirmLabel: 'حذف کن',
            }}
          >
            حذف
          </ActionButton>
        </OverflowMenu>
      </div>

      <Modal
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        title="رسید پرداخت"
        description={`${order.fullName} — ${formatPrice(order.amount, order.currency)}`}
      >
        {order.receiptPath ? (
          <>
            {order.receiptPath.endsWith('.pdf') ? (
              <a
                href={`/admin/receipts/${order.receiptPath}`}
                target="_blank"
                rel="noreferrer"
                className="text-olive-700 underline underline-offset-4"
              >
                باز کردن فایل PDF رسید
              </a>
            ) : (
              <Image
                src={`/admin/receipts/${order.receiptPath}`}
                alt="رسید پرداخت"
                width={900}
                height={1200}
                unoptimized
                className="border-line mx-auto h-auto w-full max-w-md rounded-xl border bg-white"
              />
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <ActionButton
                tone="positive"
                onAction={async () => {
                  await approveOrderAction(order.orderRef)
                  setShowReceipt(false)
                }}
              >
                تأیید پرداخت
              </ActionButton>
              <ActionButton
                tone="danger"
                onAction={async () => {
                  await rejectOrderAction(order.orderRef)
                  setShowReceipt(false)
                }}
              >
                رد رسید
              </ActionButton>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={showLink}
        onClose={() => setShowLink(false)}
        title="لینک اختصاصی آزمون"
        description="این لینک را برای مراجع بفرستید. فقط یک‌بار قابل استفاده است و پس از پایان آزمون تنها نتیجه را نشان می‌دهد."
      >
        {order.accessToken ? (
          <div className="flex flex-col gap-4">
            <p
              dir="ltr"
              className="border-line rounded-xl border bg-white px-4 py-3 text-start text-[0.8125rem] break-all"
            >
              {testLink(order.accessToken)}
            </p>
            <div>
              <CopyLink token={order.accessToken} />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={showResult}
        onClose={() => setShowResult(false)}
        title={`نتیجه — ${test?.short ?? order.testId}`}
        description={`${order.fullName} · ${order.phone}`}
      >
        {test && order.result ? (
          <ResultTable test={test} result={order.result} answers={order.answers} />
        ) : null}
      </Modal>
    </li>
  )
}
