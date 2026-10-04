import { NextRequest, NextResponse } from 'next/server'
import { attachConv, ensureAccount } from '@/lib/account'

// Заказы, которые остались только в браузере: переносим в кабинет (идентификатор диалога известен только владельцу)
export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).slice(0, 50)
  if (!ids.length) return NextResponse.json({ ok: true, moved: 0 })
  const s = await ensureAccount(req.headers.get('user-agent') ?? '')
  let moved = 0
  for (const id of ids) if (await attachConv(s.acctId, id)) moved++
  return NextResponse.json({ ok: true, moved })
}
