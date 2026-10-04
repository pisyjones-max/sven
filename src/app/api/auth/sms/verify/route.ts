import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/phone'
import { checkCode } from '@/lib/sms'
import { accountByPhone, bindPhone, createAccount, currentSession, loginAs, mergeInto } from '@/lib/account'

// Подтверждение номера кодом: привязка к кабинету, вход с нового устройства или объединение кабинетов
export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const phone = normalizePhone(String(b.phone ?? ''))
  if (!phone || !(await checkCode(phone, String(b.code ?? '')))) return NextResponse.json({ ok: false, error: 'bad_code' }, { status: 400 })
  const ua = req.headers.get('user-agent') ?? ''
  const cur = await currentSession()
  const existing = await accountByPhone(phone)

  if (cur?.role === 'owner') {
    if (!existing) { await bindPhone(cur.acctId, phone); return NextResponse.json({ ok: true, mode: 'bound' }) }
    if (existing.id === cur.acctId) return NextResponse.json({ ok: true, mode: 'same' })
    await mergeInto(existing.id, cur.acctId) // номер уже привязан к другому кабинету: заказы переезжают туда
    await loginAs(existing.id, ua)
    return NextResponse.json({ ok: true, mode: 'merged' })
  }
  if (existing) { await loginAs(existing.id, ua); return NextResponse.json({ ok: true, mode: 'login' }) }
  const a = await createAccount()
  await bindPhone(a.id, phone)
  await loginAs(a.id, ua)
  return NextResponse.json({ ok: true, mode: 'created' })
}
