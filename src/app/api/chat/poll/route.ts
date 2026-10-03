import { NextRequest, NextResponse } from 'next/server'
import { getConv } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Клиент видит всю переписку как есть (свои сообщения и ответы партнёра)
export async function GET(req: NextRequest) {
  const c = await getConv(req.nextUrl.searchParams.get('id') ?? '')
  if (!c) return NextResponse.json({ ok: false }, { status: 404 })
  return NextResponse.json({ ok: true, msgs: c.msgs })
}
