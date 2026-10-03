import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, isPlausiblePhone } from '@/lib/phone'
import { createPartner } from '@/lib/store'
import { CATEGORIES, CITIES } from '@/lib/catalog'
import { tgAdmin } from '@/lib/tg'
import { SITE_URL, TG_BOT } from '@/lib/site'

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 }) }
  if (b.website) return NextResponse.json({ ok: true }) // honeypot: бот

  const phoneRaw = String(b.phone ?? '')
  const phone = normalizePhone(phoneRaw)
  if (!phone || !isPlausiblePhone(phoneRaw)) return NextResponse.json({ ok: false, error: 'bad_phone' }, { status: 400 })
  const valid = new Set(CATEGORIES.map(c => c.slug))
  const cats = (Array.isArray(b.cats) ? b.cats : []).map(String).filter(s => valid.has(s)).slice(0, 12)
  if (!cats.length) return NextResponse.json({ ok: false, error: 'bad_cats' }, { status: 400 })
  const city = CITIES.some(c => c.slug === b.city) ? String(b.city) : 'podmoskove'
  const name = String(b.name ?? '').trim().slice(0, 80) || 'Партнёр'

  const p = await createPartner({ name, phone, cats, city })
  if (p === 'exists') return NextResponse.json({ ok: false, error: 'exists' }, { status: 409 })

  await tgAdmin(`🆕 Новый партнёр: ${p.name}, +${p.phone}\nКатегории: ${cats.join(', ')}\n${SITE_URL}/p/${p.slug}`)
  return NextResponse.json({
    ok: true,
    slug: p.slug,
    cabinet: `/cabinet/${p.token}`,
    tg: TG_BOT ? `https://t.me/${TG_BOT}?start=${p.token}` : null,
  })
}
