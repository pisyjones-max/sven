import { NextRequest, NextResponse } from 'next/server'
import { getConv, saveConv } from '@/lib/store'
import { notifyClientMessage } from '@/lib/chat'

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const c = await getConv(String(b.id ?? ''))
  const text = String(b.text ?? '').trim().slice(0, 1500)
  if (!c || !text) return NextResponse.json({ ok: false }, { status: 400 })
  c.msgs.push({ from: 'client', text, at: Date.now() })
  await saveConv(c)
  await notifyClientMessage(c, text, false)
  return NextResponse.json({ ok: true })
}
