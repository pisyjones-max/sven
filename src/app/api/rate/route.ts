import { NextRequest, NextResponse } from 'next/server'
import { rateConv } from '@/lib/store'

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const stars = Number(b.stars)
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return NextResponse.json({ ok: false, error: 'bad_stars' }, { status: 400 })
  const comment = String(b.comment ?? '').trim().slice(0, 500)
  const paidRaw = b.paid === '' || b.paid == null ? undefined : Number(b.paid)
  if (paidRaw !== undefined && (!Number.isFinite(paidRaw) || paidRaw < 0 || paidRaw > 10_000_000)) return NextResponse.json({ ok: false, error: 'bad_paid' }, { status: 400 })
  const r = await rateConv(String(b.id ?? ''), stars, comment, paidRaw)
  return NextResponse.json({ ok: r === 'ok', error: r === 'ok' ? undefined : r }, { status: r === 'ok' ? 200 : 400 })
}
