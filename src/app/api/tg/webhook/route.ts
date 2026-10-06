import { NextRequest, NextResponse } from 'next/server'
import { getConv, getPartnerByToken, listPartners, lookupTgMsg, savePartner } from '@/lib/store'
import { partnerReply } from '@/lib/chat'
import { tgSend, webhookSecret } from '@/lib/tg'
import { SITE_URL } from '@/lib/site'
import { handleBot, Incoming } from '@/lib/bot'
import { tgAdapter } from '@/lib/channels'

interface TgUser { id: number; first_name?: string }
interface Update {
  message?: {
    message_id: number
    chat: { id: number | string }
    from?: TgUser
    text?: string
    contact?: { phone_number: string; user_id?: number }
    reply_to_message?: { message_id: number }
  }
  callback_query?: { id: string; from: TgUser; data?: string; message?: { chat: { id: number | string } } }
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret()) return NextResponse.json({ ok: false }, { status: 401 })
  const u = (await req.json().catch(() => ({}))) as Update
  try {
    // Кнопки сценария заявки (клиенты)
    if (u.callback_query?.data) {
      const cq = u.callback_query
      await handleBot(tgAdapter, { chatId: String(cq.message?.chat.id ?? cq.from.id), name: cq.from.first_name ?? '', data: cq.data, cbId: cq.id })
      return NextResponse.json({ ok: true })
    }
    const m = u.message
    if (!m) return NextResponse.json({ ok: true })
    const chatId = String(m.chat.id)
    const text = (m.text ?? '').trim()
    const name = m.from?.first_name ?? ''

    // Контакт: сценарий заявки
    if (m.contact) {
      const inc: Incoming = { chatId, name, phone: m.contact.phone_number, phoneVerified: m.contact.user_id !== undefined && m.contact.user_id === m.from?.id }
      await handleBot(tgAdapter, inc)
      return NextResponse.json({ ok: true })
    }
    if (!text) return NextResponse.json({ ok: true })

    // /start <токен компании>: привязка Telegram компании
    const payload = text.startsWith('/start') ? (text.split(/\s+/)[1] ?? '') : null
    if (payload) {
      const p = await getPartnerByToken(payload)
      if (p) {
        p.tgChatId = chatId
        await savePartner(p)
        await tgSend(chatId, `Готово, ${p.name}! Заявки будут приходить сюда. Чтобы ответить клиенту, нажмите «Ответить» на сообщение с заявкой.\nКабинет: ${SITE_URL}/cabinet/${p.token}`)
        return NextResponse.json({ ok: true })
      }
    }

    // Чат компании: ответ клиенту через «Ответить» на сообщение с заявкой
    const partners = await listPartners()
    const mine = partners.filter(x => x.tgChatId === chatId)
    const replyTo = m.reply_to_message?.message_id
    if (mine.length) {
      const convId = replyTo ? await lookupTgMsg(chatId, replyTo) : null
      const c = convId ? await getConv(convId) : null
      const partner = c ? mine.find(x => x.id === c.partnerId) : null
      if (c && partner) {
        if ((await partnerReply(c, partner, text)) === 'no_balance') await tgSend(chatId, `Недостаточно средств на балансе, чтобы принять заявку. Пополните баланс: ${SITE_URL}/cabinet/${partner.token}`)
        return NextResponse.json({ ok: true })
      }
      if (payload === null && !replyTo && !text.startsWith('/')) {
        await tgSend(chatId, 'Чтобы ответить клиенту, нажмите «Ответить» на сообщение с его заявкой.')
        return NextResponse.json({ ok: true })
      }
    }

    // Клиент: сценарий заявки и общий чат
    await handleBot(tgAdapter, { chatId, name, text: payload !== null ? undefined : text, start: payload ?? undefined, replyTo: replyTo ? String(replyTo) : undefined })
  } catch (e) {
    console.error('[doma] tg webhook failed', e)
  }
  return NextResponse.json({ ok: true })
}
