import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, isPlausiblePhone } from '@/lib/phone'
import { Col, mapColumns, parseCats, parseCity, parseCsv, validSlugs } from '@/lib/csv'
import { findDuplicate, getPartner, importPartnerFull } from '@/lib/store'
import { SITE_URL, TG_BOT } from '@/lib/site'
import { CATEGORIES } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

// POST /api/admin/import-csv?key=ADMIN_KEY  { csv, apply?: boolean, live?: boolean, src?: string }
// Без apply только проверка: показывает, что будет создано, а что дубль или ошибка.
// live: мастера согласились, заявки идут им сразу; в ответе ссылки на кабинеты, чтобы отправить мастерам.
export async function POST(req: NextRequest) {
  const key = process.env.ADMIN_KEY
  if (!key || req.nextUrl.searchParams.get('key') !== key) return NextResponse.json({ ok: false }, { status: 401 })
  let b: { csv?: string; apply?: boolean; live?: boolean; src?: string }
  try { b = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }
  const rows = parseCsv(String(b.csv ?? ''))
  if (!rows.length) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 })
  const { cols, body, startLine } = mapColumns(rows)
  const get = (r: string[], k: Col) => (cols[k] >= 0 ? (r[cols[k]] ?? '').trim() : '')
  const { cats: vc, cities: vci } = validSlugs()
  const seenPhones = new Set<string>(), seenNames = new Set<string>()
  const out: { line: number; name: string; phone: string; status: string; note?: string; cats?: string; cabinet?: string; tg?: string }[] = []
  const sum = { created: 0, duplicate: 0, invalid: 0 }

  for (let i = 0; i < body.slice(0, 500).length; i++) {
    const r = body[i]
    const line = startLine + i
    const name = get(r, 'name').slice(0, 120)
    const phoneRaw = get(r, 'phone')
    const phone = normalizePhone(phoneRaw)
    const cats = parseCats(get(r, 'cats'))
    const city = parseCity(get(r, 'city'))
    const base = { line, name, phone: phone ? `+${phone}` : phoneRaw }
    const bad = (note: string) => { sum.invalid++; out.push({ ...base, status: 'ошибка', note }) }
    if (!name) { bad('нет названия'); continue }
    if (!phone || !isPlausiblePhone(phoneRaw)) { bad('телефон не распознан'); continue }
    if (!cats.length) { bad('не понятна категория (септик, мусор, покос, снег…)'); continue }
    const nameKey = `${name.toLowerCase()}:${city.slug}`
    if (seenPhones.has(phone) || seenNames.has(nameKey)) { sum.duplicate++; out.push({ ...base, status: 'дубль', note: 'уже есть выше в этом файле' }); continue }
    seenPhones.add(phone); seenNames.add(nameKey)
    const dup = await findDuplicate(name, phone, city.slug)
    if (dup) {
      const ex = await getPartner(dup.id)
      sum.duplicate++
      out.push({ ...base, status: 'дубль', note: `уже в базе: ${ex?.name ?? dup.id} (${dup.kind === 'phone' ? 'тот же телефон' : 'то же название и район'})` })
      continue
    }
    const note = city.guessed ? `район «${get(r, 'city')}» не распознан, поставлено Раменское` : undefined
    const catsTitle = cats.map(s => CATEGORIES.find(c => c.slug === s)?.title ?? s).join(', ')
    if (!b.apply) { sum.created++; out.push({ ...base, status: 'будет создан', note, cats: catsTitle }); continue }
    const res = await importPartnerFull({ name, phone, cats, city: city.slug, desc: get(r, 'desc') || undefined, price: get(r, 'price') || undefined }, vc, vci, undefined, { live: !!b.live, src: String(b.src ?? 'csv').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'csv' })
    if (res.status !== 'created' || !res.partner) { sum.duplicate++; out.push({ ...base, status: 'дубль' }); continue }
    sum.created++
    out.push({ ...base, status: 'создан', note, cats: catsTitle, cabinet: `${SITE_URL}/cabinet/${res.partner.token}`, tg: TG_BOT ? `https://t.me/${TG_BOT}?start=${res.partner.token}` : undefined })
  }
  return NextResponse.json({ ok: true, applied: !!b.apply, ...sum, rows: out })
}
