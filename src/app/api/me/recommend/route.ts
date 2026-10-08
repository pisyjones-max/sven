import { NextRequest, NextResponse } from 'next/server'
import { accountConvs, currentSession } from '@/lib/account'
import { getPartner } from '@/lib/store'
import { createRec, firstName } from '@/lib/people'
import { SITE_URL } from '@/lib/site'
import { rateLimit } from '@/lib/ratelimit'

// Порекомендовать человека или компанию. Рекомендовать можно только тех, кто уже ответил кабинету.
export async function POST(req: NextRequest) {
  const s = await currentSession()
  if (!s) return NextResponse.json({ ok: false }, { status: 401 })
  if (!rateLimit(`rec:${s.acctId}`, 30, 3600_000)) return NextResponse.json({ ok: false, error: 'rate' }, { status: 429 })
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const pid = String(b.partnerId ?? '')
  const convs = (await accountConvs(s.acctId)).filter(c => !(s.role === 'guest' && c.private))
  if (!convs.some(c => c.partnerId === pid && c.accepted)) return NextResponse.json({ ok: false, error: 'no_access' }, { status: 403 })
  const p = await getPartner(pid)
  if (!p || p.system) return NextResponse.json({ ok: false }, { status: 404 })
  const rec = await createRec(s.acctId, firstName(convs, pid), pid, String(b.comment ?? ''))
  const url = `${SITE_URL}/p/${p.slug}?rec=${rec.code}`
  return NextResponse.json({ ok: true, url, text: `Рекомендую: ${p.name}. Я с ними работал(а), всё нормально.` })
}
