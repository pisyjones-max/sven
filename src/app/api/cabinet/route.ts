import { NextRequest, NextResponse } from 'next/server'
import { getConv, getPartnerByToken, listConvs, partnerView } from '@/lib/store'
import { partnerReply } from '@/lib/chat'
import { doneForPartner } from '@/lib/loyalty-server'
import { levelFor } from '@/lib/loyalty'
import { balanceOf, billingOn, getLedger } from '@/lib/billing'
import { CATEGORIES } from '@/lib/catalog'
import { recsFor } from '@/lib/people'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const p = await getPartnerByToken(req.nextUrl.searchParams.get('token') ?? '')
  if (!p) return NextResponse.json({ ok: false }, { status: 404 })
  const convs = await Promise.all((await listConvs(p.id)).map(async c => {
    const done = await doneForPartner(p.id, c)
    return { ...partnerView(c), done, level: levelFor(p.loyalty?.tiers, done) }
  }))
  return NextResponse.json({ ok: true, partner: { name: p.name, slug: p.slug, leads: p.leads, tgBound: !!p.tgChatId, tiers: p.loyalty?.tiers ?? null },
    available: (p.available?.until ?? 0) > Date.now() ? p.available : null,
    recs: (await recsFor(p.id)).slice(0, 10).map(r => ({ name: r.name, comment: r.comment, at: r.at, uses: r.uses })),
    billing: billingOn() ? { balance: balanceOf(p), prices: CATEGORIES.filter(c => p.cats.includes(c.slug)).map(c => ({ title: c.title, lead: c.lead })), ledger: await getLedger(p.id), contact: process.env.NEXT_PUBLIC_SUPPORT_CONTACT ?? '' } : null,
    convs })
}

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const p = await getPartnerByToken(String(b.token ?? ''))
  const c = await getConv(String(b.id ?? ''))
  const text = String(b.text ?? '').trim().slice(0, 1500)
  if (!p || !c || c.partnerId !== p.id || !text) return NextResponse.json({ ok: false }, { status: 400 })
  if ((await partnerReply(c, p, text)) === 'no_balance') return NextResponse.json({ ok: false, error: 'no_balance' }, { status: 402 })
  return NextResponse.json({ ok: true })
}
