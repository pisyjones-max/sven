import { NextRequest, NextResponse } from 'next/server'
import { tgApi, webhookSecret } from '@/lib/tg'
import { maxApi, maxSecret } from '@/lib/channels'
import { SITE_URL } from '@/lib/site'

// Открой один раз после деплоя: /api/admin/setup?key=ADMIN_KEY. Подключает вебхуки Telegram и MAX (если заданы токены).
export async function GET(req: NextRequest) {
  const key = process.env.ADMIN_KEY
  if (!key || req.nextUrl.searchParams.get('key') !== key) return NextResponse.json({ ok: false }, { status: 401 })
  const telegram = await tgApi('setWebhook', { url: `${SITE_URL}/api/tg/webhook`, secret_token: webhookSecret(), allowed_updates: ['message', 'callback_query'] })
  const max = process.env.MAX_BOT_TOKEN
    ? await maxApi('POST', '/subscriptions', {}, { url: `${SITE_URL}/api/max/webhook`, update_types: ['message_created', 'message_callback', 'bot_started'], secret: maxSecret() })
    : 'MAX_BOT_TOKEN не задан'
  return NextResponse.json({ telegram: { webhook: `${SITE_URL}/api/tg/webhook`, result: telegram }, max })
}
