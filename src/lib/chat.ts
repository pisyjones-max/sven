import { Conv, Partner, getPartner, rememberTgMsg, saveConv, savePartner, partnerView } from './store'
import { tgSend, tgAdmin } from './tg'
import { SITE_URL } from './site'
import { loyaltyFor } from './loyalty-server'
import { getAccount } from './account'
import { maxAdapter, rememberClientMsg, tgAdapter } from './channels'
import { balanceOf, billingOn, canPay, chargeLead, leadPrice } from './billing'

// Клиент написал → уведомить партнёра (Telegram) и админа (копия, без масок)
export async function notifyClientMessage(c: Conv, text: string, first: boolean) {
  const p = await getPartner(c.partnerId)
  if (!p) return
  const view = partnerView(c)
  if (p.tgChatId) {
    const lastMasked = view.msgs[view.msgs.length - 1].text
    const lv = await loyaltyFor(p, c)
    const gift = lv && lv.done > 0 ? `\n🎁 Постоянный клиент: выполнено ${lv.done}, скидка ${lv.percent}%` : ''
    const head = (first ? `🏠 Новая заявка от ${c.clientName}` : `💬 ${c.clientName} пишет`) + gift
    const id = await tgSend(p.tgChatId, `${head}\n\n${lastMasked}\n\n↩️ Нажмите «Ответить» на это сообщение, чтобы написать клиенту. Контакт откроется после вашего первого ответа.`)
    if (id) await rememberTgMsg(p.tgChatId, id, c.id)
  }
  if (!p.system) await tgAdmin(`👁 [${p.name}] ${first ? 'НОВАЯ ЗАЯВКА' : 'клиент'}: ${c.clientName} ${c.clientPhone}\n${text}\n${SITE_URL}/p/${p.slug}`)
}

// Партнёр ответил (Telegram или кабинет). Первый ответ = принятый лид.
export async function partnerReply(c: Conv, p: Partner, text: string): Promise<'ok' | 'no_balance'> {
  const firstAccept = !c.accepted
  // Платные лиды: без денег на балансе первую заявку принять нельзя (на жалобу не списываем)
  if (firstAccept && !c.complaint && !canPay(p, leadPrice(c, p))) return 'no_balance'
  c.msgs.push({ from: 'partner', text, at: Date.now() })
  c.accepted = true
  const price = firstAccept ? await chargeLead(p, c) : 0
  await saveConv(c)
  if (firstAccept) {
    p.respSum = (p.respSum ?? 0) + (Date.now() - c.msgs[0].at)
    p.respCount = (p.respCount ?? 0) + 1
    p.leads += 1
    await savePartner(p)
    if (p.tgChatId) {
      const pay = billingOn() && price > 0 ? `\nСписано ${price} ₽, баланс ${balanceOf(p)} ₽.${balanceOf(p) < price * 2 ? ' Баланс заканчивается, пополните его.' : ''}` : ''
      const id = await tgSend(p.tgChatId, `✅ Лид принят. Контакт клиента: ${c.clientName}, +${c.clientPhone}\nПереписка продолжается в этом чате.${pay}`)
      if (id) await rememberTgMsg(p.tgChatId, id, c.id)
    }
  }
  await notifyClientReply(c, p, text)
  if (!p.system) await tgAdmin(`👁 [${p.name}] ответ → ${c.clientName}${firstAccept ? ' (ЛИД ПРИНЯТ)' : ''}\n${text}`)
  return 'ok'
}

// Компания ответила → сообщить клиенту и всем, кто подключил Telegram или MAX к его кабинету
async function notifyClientReply(c: Conv, p: Partner, text: string) {
  if (!c.acctId) return
  const a = await getAccount(c.acctId)
  const body = `💬 ${p.name}:\n${text}\n\nЧтобы ответить, нажмите «Ответить» на это сообщение. Чат также на сайте: ${SITE_URL}/p/${p.slug}`
  for (const chat of a?.tgChatIds ?? []) { const mid = await tgAdapter.send(chat, body); if (mid) await rememberClientMsg('tg', chat, mid, c.id) }
  for (const chat of a?.maxChatIds ?? []) { const mid = await maxAdapter.send(chat, body); if (mid) await rememberClientMsg('max', chat, mid, c.id) }
}

// Клиент написал (на сайте или в мессенджере): запись в общий чат и уведомление компании
export async function clientSays(c: Conv, text: string) {
  c.msgs.push({ from: 'client', text, at: Date.now() })
  await saveConv(c)
  await notifyClientMessage(c, text, false)
}
