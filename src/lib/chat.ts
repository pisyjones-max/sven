import { Conv, Partner, getPartner, rememberTgMsg, saveConv, savePartner, partnerView } from './store'
import { tgSend, tgAdmin } from './tg'
import { SITE_URL } from './site'
import { loyaltyFor } from './loyalty-server'
import { getAccount } from './account'

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
  await tgAdmin(`👁 [${p.name}] ${first ? 'НОВАЯ ЗАЯВКА' : 'клиент'}: ${c.clientName} ${c.clientPhone}\n${text}\n${SITE_URL}/p/${p.slug}`)
}

// Партнёр ответил (Telegram или кабинет). Первый ответ = принятый лид.
export async function partnerReply(c: Conv, p: Partner, text: string) {
  c.msgs.push({ from: 'partner', text, at: Date.now() })
  const firstAccept = !c.accepted
  c.accepted = true
  await saveConv(c)
  if (firstAccept) {
    p.respSum = (p.respSum ?? 0) + (Date.now() - c.msgs[0].at)
    p.respCount = (p.respCount ?? 0) + 1
    p.leads += 1
    await savePartner(p)
    if (p.tgChatId) {
      const id = await tgSend(p.tgChatId, `✅ Лид принят. Контакт клиента: ${c.clientName}, +${c.clientPhone}\nПереписка продолжается в этом чате.`)
      if (id) await rememberTgMsg(p.tgChatId, id, c.id)
    }
  }
  await notifyClientReply(c, p, text)
  await tgAdmin(`👁 [${p.name}] ответ → ${c.clientName}${firstAccept ? ' (ЛИД ПРИНЯТ)' : ''}\n${text}`)
}

// Компания ответила → сообщить клиенту и всем, кто подключил Telegram к его кабинету
async function notifyClientReply(c: Conv, p: Partner, text: string) {
  if (!c.acctId) return
  const a = await getAccount(c.acctId)
  for (const chat of a?.tgChatIds ?? []) await tgSend(chat, `💬 ${p.name}:\n${text}\n\nОтветить: ${SITE_URL}/p/${p.slug}`)
}
