import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, isPlausiblePhone } from '@/lib/phone'
import { createPartner, savePartner } from '@/lib/store'
import { checkCode, smsEnabled } from '@/lib/sms'
import { CATEGORIES, CITIES } from '@/lib/catalog'
import { tgAdmin } from '@/lib/tg'
import { SITE_URL, TG_BOT } from '@/lib/site'
import { verifyCaptcha } from '@/lib/captcha'
import { clientIp, rateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 }) }
  if (b.website) return NextResponse.json({ ok: true }) // honeypot: бот
  const ip = clientIp(req)
  if (!rateLimit(`reg:${ip}`, 8, 3600_000)) return NextResponse.json({ ok: false, error: 'rate' }, { status: 429 })

  const phoneRaw = String(b.phone ?? '')
  const phone = normalizePhone(phoneRaw)
  if (!phone || !isPlausiblePhone(phoneRaw)) return NextResponse.json({ ok: false, error: 'bad_phone' }, { status: 400 })
  const valid = new Set(CATEGORIES.map(c => c.slug))
  const cats = (Array.isArray(b.cats) ? b.cats : []).map(String).filter(s => valid.has(s)).slice(0, 12)
  if (!cats.length) return NextResponse.json({ ok: false, error: 'bad_cats' }, { status: 400 })
  const city = CITIES.some(c => c.slug === b.city) ? String(b.city) : 'podmoskove'
  const name = String(b.name ?? '').trim().slice(0, 80) || 'Партнёр'

  // Если SMS подключён, телефон компании подтверждается кодом (заодно защищает чужие импортированные страницы)
  // Капча проверяется при первой отправке формы (до SMS), код из SMS идёт вторым шагом без неё
  if (!(smsEnabled() && b.code) && !(await verifyCaptcha(b.captcha, ip))) return NextResponse.json({ ok: false, error: 'captcha' }, { status: 400 })
  const src = String(b.src ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'site'
  const verified = smsEnabled()
  if (verified && !(await checkCode(phone, String(b.code ?? '')))) return NextResponse.json({ ok: false, error: 'need_code' }, { status: 400 })
  const p = await createPartner({ name, phone, cats, city, src })
  if (p !== 'exists' && verified) { p.phoneVerified = true; await savePartner(p) }
  if (p === 'exists') return NextResponse.json({ ok: false, error: 'exists' }, { status: 409 })

  await tgAdmin(`🆕 Новый партнёр: ${p.name}, +${p.phone}\nИсточник: ${src}\nКатегории: ${cats.join(', ')}\n${SITE_URL}/p/${p.slug}`)
  return NextResponse.json({
    ok: true,
    slug: p.slug,
    cabinet: `/cabinet/${p.token}`,
    tg: TG_BOT ? `https://t.me/${TG_BOT}?start=${p.token}` : null,
  })
}
