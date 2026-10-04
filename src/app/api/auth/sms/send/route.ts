import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, isPlausiblePhone } from '@/lib/phone'
import { issueCode } from '@/lib/sms'

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const raw = String(b.phone ?? '')
  const phone = normalizePhone(raw)
  if (!phone || !isPlausiblePhone(raw)) return NextResponse.json({ ok: false, error: 'bad_phone' }, { status: 400 })
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local'
  const r = await issueCode(phone, ip)
  return NextResponse.json(r, { status: r.ok ? 200 : r.error === 'sms_off' ? 501 : 429 })
}
