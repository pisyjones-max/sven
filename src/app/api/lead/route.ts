import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, isPlausiblePhone } from '@/lib/phone'
import { createConv, listPartners } from '@/lib/store'
import { getCategory, getCity } from '@/lib/catalog'
import { notifyClientMessage } from '@/lib/chat'
import { kvSet } from '@/lib/kv'
import { tgAdmin } from '@/lib/tg'
import { randomBytes } from 'crypto'

const MAX_COMPANIES = 3

// Заявка «подберите исполнителя»: уходит до трёх компаниям раздела, у клиента с каждой свой чат
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
  const extra = String(b.text ?? '').trim().slice(0, 1200)
  const text = `Заявка: ${cat.title}${city ? `, ${city.name}` : ''}.${extra ? ` ${extra}` : ''}`

  const all = (await listPartners()).filter(p => p.cats.includes(cat.slug))
  const local = city && city.slug !== 'podmoskove' ? all.filter(p => p.city === city.slug || p.city === 'podmoskove') : all
  // Раздаём по очереди: у кого меньше принятых лидов, тот первым
  const chosen = (local.length ? local : all).sort((a, z) => a.leads - z.leads || a.createdAt - z.createdAt).slice(0, MAX_COMPANIES)

  const sent: { slug: string; name: string; convId: string }[] = []
  for (const p of chosen) {
    const c = await createConv(p.id, name, phone, text)
    await notifyClientMessage(c, text, true)
    sent.push({ slug: p.slug, name: p.name, convId: c.id })
  }
  if (!sent.length) {
    const id = randomBytes(5).toString('hex')
    await kvSet(`orphan:${id}`, { id, cat: cat.slug, city: city?.slug ?? '', name, phone, text, at: Date.now() })
    await tgAdmin(`📥 Заявка без компаний: ${cat.title}\n${name} +${phone}\n${text}`)
  }
  return NextResponse.json({ ok: true, sent })
}
