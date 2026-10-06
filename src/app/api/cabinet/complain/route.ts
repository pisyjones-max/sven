import { NextRequest, NextResponse } from 'next/server'
import { complainConv, getConv, getPartnerByToken } from '@/lib/store'
import { tgAdmin } from '@/lib/tg'
import { listConvs } from '@/lib/store'
import { refundLead } from '@/lib/billing'

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
  const back = c ? await refundLead(c) : 0
  await tgAdmin(`🚩 [${p.name}] жалоба на заявку: ${c?.clientName ?? ''}\n${reason}${back ? `\nВозвращено ${back} ₽` : ''}`)
  // Много жалоб подряд: возможно, компания злоупотребляет возвратами
  const all = await listConvs(p.id)
  const bad = all.filter(x => x.complaint).length, ok = all.filter(x => x.accepted).length
  if (bad >= 3 && bad / Math.max(1, ok + bad) > 0.3) await tgAdmin(`⚠️ У «${p.name}» жалоб ${bad} из ${ok + bad} заявок. Проверьте, нет ли злоупотребления.`)
  return NextResponse.json({ ok: true })
}
