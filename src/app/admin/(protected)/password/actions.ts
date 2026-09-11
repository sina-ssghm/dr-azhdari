'use server'

import { z } from 'zod'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { getPool } from '@/lib/db'
import { requireAdmin, startSession } from '@/server/session'

export type PasswordState = { error?: string; success?: boolean }

const schema = z
  .object({
    current: z.string().min(1, 'رمز عبور فعلی را وارد کنید.'),
    next: z.string().min(8, 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد.'),
    confirm: z.string().min(1, 'تکرار رمز عبور را وارد کنید.'),
  })
  .refine((v) => v.next === v.confirm, {
    message: 'رمز عبور جدید و تکرار آن یکسان نیستند.',
    path: ['confirm'],
  })
  .refine((v) => v.next !== v.current, {
    message: 'رمز عبور جدید باید با رمز فعلی متفاوت باشد.',
    path: ['next'],
  })

export async function changePasswordAction(
  _previous: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const user = await requireAdmin()

  const parsed = schema.safeParse({
    current: formData.get('current'),
    next: formData.get('next'),
    confirm: formData.get('confirm'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'اطلاعات وارد شده معتبر نیست.' }
  }

  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return { error: 'رمز عبور فعلی نادرست است.' }
  }

  try {
    const passwordHash = await hashPassword(parsed.data.next)
    await getPool().query(
      'update admin_user set password_hash = $2, updated_at = now() where id = $1',
      [user.id, passwordHash]
    )

    // The session token embeds a fingerprint of the old hash, so it is now
    // invalid — issue a fresh one to keep this browser signed in while every
    // other session is dropped.
    await startSession({ ...user, passwordHash })
  } catch (error) {
    console.error('[admin] password change failed', error)
    return { error: 'تغییر رمز عبور ناموفق بود.' }
  }

  return { success: true }
}
