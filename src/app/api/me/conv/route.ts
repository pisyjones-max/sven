import { NextRequest, NextResponse } from 'next/server'
import { accountConvs, currentSession } from '@/lib/account'
import { getPartner } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Диалог кабинета с этой компанией: так близкий видит чат на странице компании со своего телефона
export async function GET(req: NextRequest) {
  const s = await currentSession()
  const slug = req.nextUrl.searchParams.get('slug') ?? ''
  if (!s || !slug) return NextResponse.json({ ok: true, id: null })
  for (const c of (await accountConvs(s.acctId)).sort((a, b) => b.createdAt - a.createdAt)) {
    const p = await getPartner(c.partnerId)
    if (p?.slug === slug) return NextResponse.json({ ok: true, id: c.id })
  }
  return NextResponse.json({ ok: true, id: null })
}
