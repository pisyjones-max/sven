import { NextRequest, NextResponse } from 'next/server'
import { tgApi, webhookSecret } from '@/lib/tg'
import { SITE_URL } from '@/lib/site'

// Открой один раз после деплоя: /api/admin/setup?key=ADMIN_KEY — подключит Telegram webhook
export async function GET(req: NextRequest) {
  const key = process.env.ADMIN_KEY
  if (!key || req.nextUrl.searchParams.get('key') !== key) return NextResponse.json({ ok: false }, { status: 401 })
  const r = await tgApi('setWebhook', { url: `${SITE_URL}/api/tg/webhook`, secret_token: webhookSecret(), allowed_updates: ['message'] })
  return NextResponse.json({ webhook: `${SITE_URL}/api/tg/webhook`, telegram: r })
}
