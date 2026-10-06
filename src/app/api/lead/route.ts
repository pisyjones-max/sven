import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, isPlausiblePhone } from '@/lib/phone'
import { getCategory, getCity } from '@/lib/catalog'
import { ensureAccount } from '@/lib/account'
import { composeRequest } from '@/lib/questions'
import { dispatchLead } from '@/lib/lead'

// Заявка «подберите исполнителя»: ответы на вопросы или свободный текст
export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 }) }
  if (b.website) return NextResponse.json({ ok: true, sent: [] }) // honeypot

  const cat = getCategory(String(b.cat ?? ''))
  if (!cat) return NextResponse.json({ ok: false, error: 'no_cat' }, { status: 400 })
  const phoneRaw = String(b.phone ?? '')
  const phone = normalizePhone(phoneRaw)
  if (!phone || !isPlausiblePhone(phoneRaw)) return NextResponse.json({ ok: false, error: 'bad_phone' }, { status: 400 })
  if (b.consent !== true) return NextResponse.json({ ok: false, error: 'no_consent' }, { status: 400 })
  const name = String(b.name ?? '').trim().slice(0, 80)
  if (!name) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 })
  const city = getCity(String(b.city ?? ''))
  const note = String(b.note ?? b.text ?? '').trim().slice(0, 1200)
  const text = composeRequest(cat.title, city && city.slug !== 'podmoskove' ? city.name : city?.name, cat.slug, b.answers as Record<string, unknown> | undefined, note)

  const acct = await ensureAccount(req.headers.get('user-agent') ?? '')
  const sent = await dispatchLead({ cat, city, name, phone, text, acctId: acct.acctId })
  return NextResponse.json({ ok: true, sent })
}
