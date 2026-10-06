import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvScanKeys } from '@/lib/kv'

export const dynamic = 'force-dynamic'

// Полная выгрузка базы в JSON (для копии, когда данные лежат в Redis): GET /api/admin/export?key=ADMIN_KEY
export async function GET(req: NextRequest) {
  const key = process.env.ADMIN_KEY
  if (!key || req.nextUrl.searchParams.get('key') !== key) return NextResponse.json({ ok: false }, { status: 401 })
  const out: Record<string, unknown> = {}
  for (const k of await kvScanKeys('*')) out[k] = await kvGet(k)
  return new NextResponse(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } })
}
