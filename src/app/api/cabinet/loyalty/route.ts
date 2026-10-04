import { NextRequest, NextResponse } from 'next/server'
import { getPartnerByToken, savePartner } from '@/lib/store'
import { PRESETS, parseTiers } from '@/lib/loyalty'

// Компания включает, меняет или выключает скидки постоянным клиентам
export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const p = await getPartnerByToken(String(b.token ?? ''))
  if (!p) return NextResponse.json({ ok: false }, { status: 404 })
  if (b.off === true) p.loyalty = undefined
  else {
    const tiers = typeof b.preset === 'string' && PRESETS[b.preset] ? PRESETS[b.preset].tiers : parseTiers(b.tiers)
    if (!tiers) return NextResponse.json({ ok: false, error: 'bad_tiers' }, { status: 400 })
    p.loyalty = { tiers }
  }
  await savePartner(p)
  return NextResponse.json({ ok: true, tiers: p.loyalty?.tiers ?? null })
}
