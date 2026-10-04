import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIE, currentSession, revokeSession } from '@/lib/account'

// Гость выходит сам. Владельцу выход закрыт: без регистрации вернуться в кабинет было бы нечем.
export async function POST() {
  const s = await currentSession()
  if (!s || s.role !== 'guest') return NextResponse.json({ ok: false }, { status: 400 })
  await revokeSession(s.acctId, s.id)
  ;(await cookies()).delete(COOKIE)
  return NextResponse.json({ ok: true })
}
