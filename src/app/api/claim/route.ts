import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { normalizePhone, isPlausiblePhone } from '@/lib/phone'
import { getPartnerBySlug } from '@/lib/store'
import { kvSet } from '@/lib/kv'
import { tgAdmin } from '@/lib/tg'
import { SITE_URL } from '@/lib/site'
import { verifyCaptcha } from '@/lib/captcha'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// «Это моя компания»: заявка уходит админу на ручную проверку
export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  if (b.website) return NextResponse.json({ ok: true })
  const ip = clientIp(req)
  if (!rateLimit(`claim:${ip}`, 5, 3600_000)) return NextResponse.json({ ok: false }, { status: 429 })
  if (!(await verifyCaptcha(b.captcha, ip))) return NextResponse.json({ ok: false, error: 'captcha' }, { status: 400 })
  const p = await getPartnerBySlug(String(b.slug ?? ''))
  const phoneRaw = String(b.phone ?? '')
  const phone = normalizePhone(phoneRaw)
  if (!p || !p.imported || p.claimed || !phone || !isPlausiblePhone(phoneRaw)) return NextResponse.json({ ok: false }, { status: 400 })
  const name = String(b.name ?? '').trim().slice(0, 80)
  const id = randomBytes(5).toString('hex')
  await kvSet(`claim:${id}`, { id, slug: p.slug, partner: p.name, name, phone, at: Date.now() })
  await tgAdmin(`🏷 Хотят забрать компанию «${p.name}»\n${name} +${phone}\n${SITE_URL}/p/${p.slug}`)
  return NextResponse.json({ ok: true })
}
