import { NextRequest, NextResponse } from 'next/server'
import { importParserCards, MAX_CARDS_PER_REQUEST } from '@/lib/yandex-import'

export const dynamic = 'force-dynamic'

// POST /api/admin/import-parser?key=ADMIN_KEY  { cards: [...], apply?: boolean }
// cards: карточки исполнителей в исходном формате парсера (yandex_all_companies.json), без конвертации.
// Без apply только проверка: ничего не пишется. Большой файл браузер режет на пачки по MAX_CARDS_PER_REQUEST.
export async function POST(req: NextRequest) {
  const key = process.env.ADMIN_KEY
  if (!key || req.nextUrl.searchParams.get('key') !== key) return NextResponse.json({ ok: false }, { status: 401 })
  let b: { cards?: unknown; apply?: boolean }
  try { b = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Тело запроса не JSON' }, { status: 400 }) }
  if (!Array.isArray(b.cards)) return NextResponse.json({ ok: false, error: 'Ожидается массив cards' }, { status: 400 })
  if (b.cards.length > MAX_CARDS_PER_REQUEST) return NextResponse.json({ ok: false, error: `За один запрос не больше ${MAX_CARDS_PER_REQUEST} карточек` }, { status: 413 })
  const report = await importParserCards(b.cards, !!b.apply)
  return NextResponse.json({ ok: true, ...report })
}
