import { NextRequest, NextResponse } from 'next/server'
import { getConv, getPartnerByToken, listPartners, lookupTgMsg, savePartner } from '@/lib/store'
import { partnerReply } from '@/lib/chat'
import { bindTelegram } from '@/lib/account'
import { tgSend, webhookSecret } from '@/lib/tg'
import { SITE_URL } from '@/lib/site'

interface Update {
  message?: {
    message_id: number
    chat: { id: number | string }
    text?: string
    reply_to_message?: { message_id: number }
  }
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret()) return NextResponse.json({ ok: false }, { status: 401 })
  const u = (await req.json().catch(() => ({}))) as Update
  const m = u.message
  if (!m?.text) return NextResponse.json({ ok: true })
  const chatId = String(m.chat.id)
  const text = m.text.trim()

  // /start <token>: привязка Telegram к партнёру
  if (text.startsWith('/start')) {
    const token = text.split(/\s+/)[1] ?? ''
    if (token.startsWith('c_')) {
      const ok = await bindTelegram(token.slice(2), chatId)
      await tgSend(chatId, ok ? `Готово! Сообщим сюда, когда компании ответят.\nВаши заказы: ${SITE_URL}/orders` : 'Ссылка устарела. Откройте сайт и нажмите кнопку подключения Telegram ещё раз.')
      return NextResponse.json({ ok: true })
    }
    const p = token ? await getPartnerByToken(token) : null
    if (p) {
      p.tgChatId = chatId
      await savePartner(p)
      await tgSend(chatId, `Готово, ${p.name}! Заявки будут приходить сюда. Чтобы ответить клиенту, нажмите «Ответить» на сообщение с заявкой.\nКабинет: ${SITE_URL}/cabinet/${p.token}`)
    } else {
      const mine = (await listPartners()).find(x => x.tgChatId === chatId)
      await tgSend(chatId, mine ? `Ваш кабинет: ${SITE_URL}/cabinet/${mine.token}` : `Зарегистрируйтесь на сайте за минуту: ${SITE_URL}/partner/register`)
    }
    return NextResponse.json({ ok: true })
  }

  // Ответ партнёра на сообщение с заявкой
  const replyTo = m.reply_to_message?.message_id
  const convId = replyTo ? await lookupTgMsg(chatId, replyTo) : null
  const c = convId ? await getConv(convId) : null
  if (!c) {
    await tgSend(chatId, 'Чтобы ответить клиенту, нажмите «Ответить» на сообщение с его заявкой.')
    return NextResponse.json({ ok: true })
  }
  const partner = (await listPartners()).find(x => x.id === c.partnerId && x.tgChatId === chatId)
  if (!partner) return NextResponse.json({ ok: true })
  await partnerReply(c, partner, text)
  return NextResponse.json({ ok: true })
}
