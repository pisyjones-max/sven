import { NextRequest, NextResponse } from 'next/server'
import { CATEGORIES, CITIES } from '@/lib/catalog'
import { ImportItem, importPartner } from '@/lib/store'

// POST /api/admin/import?key=ADMIN_KEY
// Тело: { "source": {"name": "...", "url": "..."}, "companies": [ {name, cats, city, phone, desc, ...} ] } или просто массив компаний.
// Только данные из согласованного источника (соглашение с площадкой или сами компании).
export async function POST(req: NextRequest) {
  const key = process.env.ADMIN_KEY
  if (!key || req.nextUrl.searchParams.get('key') !== key) return NextResponse.json({ ok: false }, { status: 401 })
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }
  const obj = (Array.isArray(body) ? { companies: body } : body) as { source?: { name: string; url: string }; companies?: ImportItem[] }
  const list = (obj.companies ?? []).slice(0, 500)
  const cats = new Set(CATEGORIES.map(c => c.slug))
  const cities = new Set(CITIES.map(c => c.slug))
  const res = { created: 0, skipped: 0, invalid: 0 }
  for (const item of list) res[await importPartner(item, cats, cities, obj.source)]++
  return NextResponse.json({ ok: true, ...res })
}
