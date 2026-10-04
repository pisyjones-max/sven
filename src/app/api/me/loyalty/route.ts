import { NextRequest, NextResponse } from 'next/server'
import { accountConvs, currentSession } from '@/lib/account'
import { getPartnerBySlug } from '@/lib/store'
import { doneCount, levelFor } from '@/lib/loyalty'

export const dynamic = 'force-dynamic'

// Уровень скидки кабинета у этой компании (для страницы компании)
export async function GET(req: NextRequest) {
  const s = await currentSession()
  const p = await getPartnerBySlug(req.nextUrl.searchParams.get('slug') ?? '')
  if (!s || !p || !p.loyalty) return NextResponse.json({ ok: true, level: null })
  const done = doneCount((await accountConvs(s.acctId)).filter(c => c.partnerId === p.id))
  return NextResponse.json({ ok: true, level: levelFor(p.loyalty.tiers, done) })
}
