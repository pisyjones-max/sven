import { NextRequest, NextResponse } from 'next/server'
import { getPartnerBySlug } from '@/lib/store'
import { topUp } from '@/lib/billing'

// POST /api/admin/balance?key=ADMIN_KEY  { slug, amount, reason? }: пополнение или корректировка баланса компании
export async function POST(req: NextRequest) {
  const key = process.env.ADMIN_KEY
  if (!key || req.nextUrl.searchParams.get('key') !== key) return NextResponse.json({ ok: false }, { status: 401 })
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const p = await getPartnerBySlug(String(b.slug ?? ''))
  const amount = Math.round(Number(b.amount))
  if (!p || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) return NextResponse.json({ ok: false, error: 'bad_input' }, { status: 400 })
  const balance = await topUp(p, amount, String(b.reason ?? (amount > 0 ? 'Пополнение' : 'Корректировка')).slice(0, 80))
  return NextResponse.json({ ok: true, balance })
}
