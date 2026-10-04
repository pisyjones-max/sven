import { NextRequest, NextResponse } from 'next/server'
import { complainConv, getConv, getPartnerByToken } from '@/lib/store'
import { tgAdmin } from '@/lib/tg'

// Компания отмечает заявку как спам или не по теме: заявка не засчитывается
export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const p = await getPartnerByToken(String(b.token ?? ''))
  if (!p) return NextResponse.json({ ok: false }, { status: 404 })
  const id = String(b.id ?? '')
  const reason = String(b.reason ?? 'не по теме').trim().slice(0, 200)
  if (!(await complainConv(id, p.id, reason))) return NextResponse.json({ ok: false }, { status: 400 })
  const c = await getConv(id)
  await tgAdmin(`🚩 [${p.name}] жалоба на заявку: ${c?.clientName ?? ''}\n${reason}`)
  return NextResponse.json({ ok: true })
}
