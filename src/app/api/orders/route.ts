import { NextRequest, NextResponse } from 'next/server'
import { getConv } from '@/lib/store'
import { buildOrders } from '@/lib/orders'

export const dynamic = 'force-dynamic'

// Запасной путь для заказов, сохранённых только в браузере (до появления кабинета)
export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 50)
  const convs = (await Promise.all(ids.map(getConv))).filter((c): c is NonNullable<typeof c> => !!c)
  return NextResponse.json({ ok: true, orders: await buildOrders(convs) })
}
