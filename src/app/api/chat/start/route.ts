import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, isPlausiblePhone } from '@/lib/phone'
import { createConv, getPartnerBySlug, isLive } from '@/lib/store'
import { notifyClientMessage } from '@/lib/chat'
import { attachConv, ensureAccount } from '@/lib/account'

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 }) }
  if (b.website) return NextResponse.json({ ok: true, id: 'x' }) // honeypot
  const p = await getPartnerBySlug(String(b.slug ?? ''))
  if (!p || !isLive(p)) return NextResponse.json({ ok: false, error: 'no_partner' }, { status: 404 })
  const phoneRaw = String(b.phone ?? '')
  const phone = normalizePhone(phoneRaw)
  if (!phone || !isPlausiblePhone(phoneRaw)) return NextResponse.json({ ok: false, error: 'bad_phone' }, { status: 400 })
  if (b.consent !== true) return NextResponse.json({ ok: false, error: 'no_consent' }, { status: 400 })
  const name = String(b.name ?? '').trim().slice(0, 80)
  const text = String(b.text ?? '').trim().slice(0, 1500)
  if (!name || !text) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 })
  const acct = await ensureAccount(req.headers.get('user-agent') ?? '')
  const c = await createConv(p.id, name, phone, text, acct.acctId)
  await attachConv(acct.acctId, c.id)
  await notifyClientMessage(c, text, true)
  return NextResponse.json({ ok: true, id: c.id })
}
