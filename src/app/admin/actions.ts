'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { verifyPassword } from '@/lib/auth'
import { endSession, findAdminByUsername, startSession } from '@/server/session'

export type LoginState = { error?: string }

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
})

export async function loginAction(
  _previous: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: 'نام کاربری و رمز عبور را وارد کنید.' }
  }

  let ok = false
  try {
    const user = await findAdminByUsername(parsed.data.username)
    // One message for both failure modes so the form never reveals whether a
    // username exists.
    if (user && (await verifyPassword(parsed.data.password, user.passwordHash))) {
      await startSession(user)
      ok = true
    }
  } catch (error) {
    console.error('[admin] login failed', error)
    return { error: 'اتصال به پایگاه داده برقرار نشد. لطفاً بعداً تلاش کنید.' }
  }

  if (!ok) return { error: 'نام کاربری یا رمز عبور نادرست است.' }

  // Outside the try: redirect() signals by throwing.
  redirect('/admin')
}

export async function logoutAction(): Promise<void> {
  await endSession()
  redirect('/admin/login')
}
