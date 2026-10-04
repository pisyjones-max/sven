import { NextRequest, NextResponse } from 'next/server'
import { createTgBind, ensureAccount } from '@/lib/account'
import { TG_BOT } from '@/lib/site'

// Ссылка на бота: клиент нажимает «Старт», и ответы компаний приходят ему в Telegram
export async function POST(req: NextRequest) {
  if (!TG_BOT) return NextResponse.json({ ok: false, error: 'tg_off' }, { status: 501 })
  const s = await ensureAccount(req.headers.get('user-agent') ?? '')
  const token = await createTgBind(s.acctId)
  return NextResponse.json({ ok: true, url: `https://t.me/${TG_BOT}?start=c_${token}` })
}
