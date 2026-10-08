import { NextRequest, NextResponse } from 'next/server'
import { getRec } from '@/lib/people'
import { getPartner } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Публично: кто рекомендует и что написал. Больше ничего о рекомендателе не отдаём.
export async function GET(req: NextRequest) {
  const rec = await getRec(req.nextUrl.searchParams.get('code') ?? '')
  const p = rec ? await getPartner(rec.partnerId) : null
  if (!rec || !p) return NextResponse.json({ ok: false })
  return NextResponse.json({ ok: true, name: rec.name, comment: rec.comment, slug: p.slug })
}
