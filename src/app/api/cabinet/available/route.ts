import { NextRequest, NextResponse } from 'next/server'
import { getPartnerByToken, savePartner } from '@/lib/store'

// «Готов помочь сейчас»: на время попадаете первым в раздачу заявок и видны на своей странице. POST { token, hours, note } или { token, off: true }
export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const p = await getPartnerByToken(String(b.token ?? ''))
  if (!p) return NextResponse.json({ ok: false }, { status: 404 })
  if (b.off) { p.available = undefined; await savePartner(p); return NextResponse.json({ ok: true, available: null }) }
  const hours = Math.min(12, Math.max(1, Math.round(Number(b.hours) || 2)))
  p.available = { until: Date.now() + hours * 3600_000, note: String(b.note ?? '').trim().slice(0, 120) || undefined }
  await savePartner(p)
  return NextResponse.json({ ok: true, available: p.available })
}
