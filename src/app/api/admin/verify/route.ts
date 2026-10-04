import { NextRequest, NextResponse } from 'next/server'
import { getPartnerBySlug, savePartner } from '@/lib/store'

// /api/admin/verify?key=ADMIN_KEY&slug=...&on=1  ставит или снимает метку «Проверена платформой»
export async function GET(req: NextRequest) {
  const key = process.env.ADMIN_KEY
  const q = req.nextUrl.searchParams
  if (!key || q.get('key') !== key) return NextResponse.json({ ok: false }, { status: 401 })
  const p = await getPartnerBySlug(q.get('slug') ?? '')
  if (!p) return NextResponse.json({ ok: false }, { status: 404 })
  p.verified = q.get('on') === '1'
  await savePartner(p)
  return new NextResponse(null, { status: 302, headers: { Location: `/admin?key=${encodeURIComponent(key)}` } })
}
