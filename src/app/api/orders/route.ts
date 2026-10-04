import { NextRequest, NextResponse } from 'next/server'
import { getConv, getPartner } from '@/lib/store'
import { getCategory } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

// Заказы клиента: идентификаторы диалогов лежат только в его браузере
export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 50)
  const orders = []
  for (const id of ids) {
    const c = await getConv(id)
    if (!c) continue
    const p = await getPartner(c.partnerId)
    if (!p) continue
    orders.push({
      id: c.id, slug: p.slug, partnerName: p.name, cat: getCategory(p.cats[0])?.title ?? '',
      createdAt: c.createdAt, accepted: c.accepted, last: c.msgs[c.msgs.length - 1]?.text.slice(0, 120) ?? '',
      rating: c.rating ? { stars: c.rating.stars, comment: c.rating.comment } : null, paid: c.paid ?? null,
    })
  }
  orders.sort((a, b) => b.createdAt - a.createdAt)
  return NextResponse.json({ ok: true, orders })
}
