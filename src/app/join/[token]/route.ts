import { NextRequest, NextResponse } from 'next/server'
import { joinWithInvite } from '@/lib/account'

export const dynamic = 'force-dynamic'

// Вход по QR-коду или ссылке: без регистрации, сразу в общий кабинет
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ok = await joinWithInvite(token, req.headers.get('user-agent') ?? '')
  return new NextResponse(null, { status: 302, headers: { Location: ok ? '/orders?joined=1' : '/orders?invite=bad' } })
}
