import { NextRequest, NextResponse } from 'next/server'
import { getConv, getPartnerByToken, listConvs, partnerView } from '@/lib/store'
import { partnerReply } from '@/lib/chat'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const p = await getPartnerByToken(req.nextUrl.searchParams.get('token') ?? '')
  if (!p) return NextResponse.json({ ok: false }, { status: 404 })
  const convs = (await listConvs(p.id)).map(partnerView)
  return NextResponse.json({ ok: true, partner: { name: p.name, slug: p.slug, leads: p.leads, tgBound: !!p.tgChatId }, convs })
}

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const p = await getPartnerByToken(String(b.token ?? ''))
  const c = await getConv(String(b.id ?? ''))
  const text = String(b.text ?? '').trim().slice(0, 1500)
  if (!p || !c || c.partnerId !== p.id || !text) return NextResponse.json({ ok: false }, { status: 400 })
  await partnerReply(c, p, text)
  return NextResponse.json({ ok: true })
}
