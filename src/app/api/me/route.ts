import { NextRequest, NextResponse } from 'next/server'
import { accountConvs, currentSession, getAccount, listSessions, maskPhone } from '@/lib/account'
import { buildOrders } from '@/lib/orders'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const s = await currentSession()
  if (!s) return NextResponse.json({ ok: true, none: true, count: 0, orders: [] })
  const orders = await buildOrders(await accountConvs(s.acctId), s.role)
  if (req.nextUrl.searchParams.get('summary')) return NextResponse.json({ ok: true, count: orders.length, role: s.role })
  const devices = s.role === 'owner'
    ? (await listSessions(s.acctId)).map(d => ({ id: d.id, label: d.label, role: d.role, at: d.at, current: d.id === s.id }))
    : undefined
  const a = await getAccount(s.acctId)
  return NextResponse.json({ ok: true, role: s.role, orders, devices, phone: a?.phone ? maskPhone(a.phone) : null, tg: a?.tgChatIds?.length ?? 0 })
}
