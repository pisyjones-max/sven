import { Conv, Partner, createConv, getPartner, isLive, listPartners, saveConv } from './store'
import { attachConv } from './account'
import { notifyClientMessage, notifyClientReply } from './chat'
import { canPay, leadPrice } from './billing'
import { tgAdmin } from './tg'

// «Передать заказ»: компания занята и передаёт заказ тому, кому доверяет. История сохраняется:
// у клиента остаётся прежний чат с пометкой и появляется новый чат с новой компанией.
const catOf = (p: Partner, c: Conv) => c.cat ?? p.cats[0]

export async function handoffCandidates(p: Partner, c: Conv) {
  const cat = catOf(p, c)
  const now = Date.now()
  return (await listPartners())
    .filter(x => !x.system && !x.demo && x.id !== p.id && isLive(x) && x.cats.includes(cat) && canPay(x, leadPrice(c, x)))
    .map(x => ({ id: x.id, name: x.name, city: x.city, free: (x.available?.until ?? 0) > now }))
    .sort((a, b) => Number(b.free) - Number(a.free) || a.name.localeCompare(b.name, 'ru'))
    .slice(0, 20)
}

export async function handoff(p: Partner, c: Conv, toId: string): Promise<'ok' | 'bad' | 'already'> {
  if (c.handedTo) return 'already'
  if (c.complaint) return 'bad'
  if (!(await handoffCandidates(p, c)).some(x => x.id === toId)) return 'bad'
  const to = await getPartner(toId)
  if (!to) return 'bad'
  const text = c.msgs.find(m => m.from === 'client')?.text ?? ''
  const nc = await createConv(to.id, c.clientName, c.clientPhone, text, c.acctId, { cat: c.cat, reqId: c.reqId, private: c.private, handedFrom: p.name })
  if (c.acctId) await attachConv(c.acctId, nc.id)
  c.handedTo = { partnerId: to.id, name: to.name, at: Date.now() }
  c.msgs.push({ from: 'partner', text: `Сейчас не смогу, передал(а) ваш заказ: ${to.name}. Они напишут вам в новом чате. Если не хотите, просто не отвечайте.`, at: Date.now() })
  await saveConv(c)
  await notifyClientMessage(nc, text, true)
  await notifyClientReply(c, p, c.msgs[c.msgs.length - 1].text)
  await tgAdmin(`🔁 [${p.name}] передал заказ → ${to.name} (клиент ${c.clientName})`)
  return 'ok'
}
