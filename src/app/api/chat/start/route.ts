import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, isPlausiblePhone } from '@/lib/phone'
import { createConv, getPartnerBySlug, isLive } from '@/lib/store'
import { notifyClientMessage } from '@/lib/chat'
import { attachConv, ensureAccount } from '@/lib/account'
import { getCategory } from '@/lib/catalog'
import { composeRequest } from '@/lib/questions'
import { verifyCaptcha } from '@/lib/captcha'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { getRec, countRecUse } from '@/lib/people'

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 }) }
  if (b.website) return NextResponse.json({ ok: true, id: 'x' }) // honeypot
  const ip = clientIp(req)
  if (!rateLimit(`chat:${ip}`, 10, 3600_000)) return NextResponse.json({ ok: false, error: 'rate' }, { status: 429 })
  if (!(await verifyCaptcha(b.captcha, ip))) return NextResponse.json({ ok: false, error: 'captcha' }, { status: 400 })
  const p = await getPartnerBySlug(String(b.slug ?? ''))
  if (!p || !isLive(p)) return NextResponse.json({ ok: false, error: 'no_partner' }, { status: 404 })
  const phoneRaw = String(b.phone ?? '')
  const phone = normalizePhone(phoneRaw)
  if (!phone || !isPlausiblePhone(phoneRaw)) return NextResponse.json({ ok: false, error: 'bad_phone' }, { status: 400 })
  if (b.consent !== true) return NextResponse.json({ ok: false, error: 'no_consent' }, { status: 400 })
  const name = String(b.name ?? '').trim().slice(0, 80)
  let text = String(b.text ?? b.note ?? '').trim().slice(0, 1500)
  const cat = getCategory(String(b.cat ?? ''))
  if (cat && b.answers) text = composeRequest(cat.title, undefined, cat.slug, b.answers as Record<string, unknown>, String(b.note ?? '').trim().slice(0, 1200))
  if (!name || !text) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 })
  const acct = await ensureAccount(req.headers.get('user-agent') ?? '')
  const rec = b.rec ? await getRec(String(b.rec)) : null
  const goodRec = rec && rec.partnerId === p.id && rec.acctId !== acct.acctId ? rec : null
  const c = await createConv(p.id, name, phone, text, acct.acctId, { cat: cat?.slug, private: b.private === true, recBy: goodRec?.acctId, recName: goodRec?.name })
  if (goodRec) await countRecUse(goodRec)
  await attachConv(acct.acctId, c.id)
  await notifyClientMessage(c, text, true)
  return NextResponse.json({ ok: true, id: c.id })
}
