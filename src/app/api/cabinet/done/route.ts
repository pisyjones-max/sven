import { NextRequest, NextResponse } from 'next/server'
import { getPartnerByToken, markDone } from '@/lib/store'
import { loyaltyFor } from '@/lib/loyalty-server'
import { tgAdmin } from '@/lib/tg'

// Компания отмечает «работа выполнена»: заказ засчитывается в накопительную скидку кабинета клиента
export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const p = await getPartnerByToken(String(b.token ?? ''))
  if (!p) return NextResponse.json({ ok: false }, { status: 404 })
  const amountRaw = b.amount === '' || b.amount == null ? undefined : Number(b.amount)
  if (amountRaw !== undefined && (!Number.isFinite(amountRaw) || amountRaw < 0 || amountRaw > 10_000_000)) return NextResponse.json({ ok: false, error: 'bad_amount' }, { status: 400 })
  const c = await markDone(String(b.id ?? ''), p.id, amountRaw)
  if (!c) return NextResponse.json({ ok: false }, { status: 400 })
  const level = await loyaltyFor(p, c)
  await tgAdmin(`✔ [${p.name}] работа выполнена: ${c.clientName}${amountRaw ? `, ${amountRaw} ₽` : ''}`)
  return NextResponse.json({ ok: true, level })
}
