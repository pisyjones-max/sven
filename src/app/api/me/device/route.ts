import { NextRequest, NextResponse } from 'next/server'
import { currentSession, revokeSession } from '@/lib/account'

// Владелец отключает чужое устройство
export async function POST(req: NextRequest) {
  const s = await currentSession()
  if (!s || s.role !== 'owner') return NextResponse.json({ ok: false }, { status: 403 })
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const ok = await revokeSession(s.acctId, String(b.id ?? ''))
  return NextResponse.json({ ok })
}
