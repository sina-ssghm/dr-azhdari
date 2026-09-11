'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  createDiscount,
  deleteDiscount,
  toggleDiscount,
  updateDiscount,
} from '@/server/discounts'
import { BOOKABLE_SERVICE_IDS } from '@/server/settings'
import { requireAdmin } from '@/server/session'

export type DiscountState = { error?: string; success?: boolean }

/** Accepts "2,500,000" as well as "2500000". */
const money = z
  .string()
  .trim()
  .transform((v) => Number(v.replace(/[,\s]/g, '')))
  .refine(
    (n) => Number.isFinite(n) && n >= 0,
    'مبلغ باید عددی بزرگ‌تر یا مساوی صفر باشد.'
  )

const schema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    code: z
      .string()
      .trim()
      .min(3, 'کد باید حداقل ۳ کاراکتر باشد.')
      .max(40)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'کد فقط می‌تواند شامل حروف انگلیسی، عدد، خط تیره و زیرخط باشد.'
      ),
    kind: z.enum(['percent', 'fixed']),
    percent: z.coerce.number().optional(),
    amountIrt: money.optional(),
    amountUsdt: money.optional(),
    expiresOn: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    isActive: z.boolean(),
    maxUses: z.coerce.number().int().positive().nullable(),
    serviceIds: z.array(z.enum(BOOKABLE_SERVICE_IDS as unknown as [string, ...string[]])),
  })
  .refine(
    (v) =>
      v.kind !== 'percent' || (v.percent != null && v.percent > 0 && v.percent <= 100),
    {
      message: 'درصد تخفیف باید عددی بین ۱ تا ۱۰۰ باشد.',
      path: ['percent'],
    }
  )
  .refine((v) => v.kind !== 'fixed' || (v.amountIrt != null && v.amountUsdt != null), {
    message: 'برای تخفیف مبلغ ثابت، هر دو مبلغ تومان و تتر را وارد کنید.',
    path: ['amountIrt'],
  })

function parse(formData: FormData) {
  const optional = (name: string) => {
    const value = formData.get(name)
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
  }

  return schema.safeParse({
    id: optional('id') ?? undefined,
    code: formData.get('code') ?? '',
    kind: formData.get('kind') ?? 'percent',
    percent: optional('percent') ?? undefined,
    amountIrt: optional('amountIrt') ?? undefined,
    amountUsdt: optional('amountUsdt') ?? undefined,
    expiresOn: optional('expiresOn'),
    isActive: formData.get('isActive') === 'on',
    maxUses: optional('maxUses'),
    serviceIds: formData.getAll('serviceIds').map(String),
  })
}

export async function saveDiscountAction(
  _previous: DiscountState,
  formData: FormData
): Promise<DiscountState> {
  await requireAdmin()

  const parsed = parse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'اطلاعات وارد شده معتبر نیست.' }
  }

  const { id, percent, amountIrt, amountUsdt, ...rest } = parsed.data
  const input = {
    ...rest,
    percent: rest.kind === 'percent' ? (percent ?? null) : null,
    amountIrt: rest.kind === 'fixed' ? (amountIrt ?? 0) : null,
    amountUsdt: rest.kind === 'fixed' ? (amountUsdt ?? 0) : null,
  }

  try {
    if (id) await updateDiscount(id, input)
    else await createDiscount(input)
  } catch (error) {
    // 23505 = duplicate code.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      return { error: 'کدی با این عنوان از قبل وجود دارد.' }
    }
    console.error('[admin] saving discount failed', error)
    return { error: 'ذخیره‌سازی ناموفق بود.' }
  }

  revalidatePath('/admin/discounts')
  return { success: true }
}

export async function toggleDiscountAction(id: number, next: boolean): Promise<void> {
  await requireAdmin()
  if (Number.isInteger(id)) await toggleDiscount(id, next)
  revalidatePath('/admin/discounts')
}

export async function deleteDiscountAction(id: number): Promise<void> {
  await requireAdmin()
  if (Number.isInteger(id)) await deleteDiscount(id)
  revalidatePath('/admin/discounts')
}
