import { NextRequest, NextResponse } from 'next/server'
import { getConv, getPartnerByToken } from '@/lib/store'
import { handoff, handoffCandidates } from '@/lib/handoff'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const p = await getPartnerByToken(req.nextUrl.searchParams.get('token') ?? '')
  const c = await getConv(req.nextUrl.searchParams.get('id') ?? '')
  if (!p || !c || c.partnerId !== p.id) return NextResponse.json({ ok: false }, { status: 404 })
  return NextResponse.json({ ok: true, list: await handoffCandidates(p, c) })
}

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const p = await getPartnerByToken(String(b.token ?? ''))
  const c = await getConv(String(b.id ?? ''))
  if (!p || !c || c.partnerId !== p.id) return NextResponse.json({ ok: false }, { status: 404 })
  const r = await handoff(p, c, String(b.toId ?? ''))
  return NextResponse.json({ ok: r === 'ok', error: r === 'ok' ? undefined : r }, { status: r === 'ok' ? 200 : 400 })
}
