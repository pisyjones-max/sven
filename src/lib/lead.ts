import { randomBytes } from 'crypto'
import { Category, City } from './catalog'
import { attachConv } from './account'
import { notifyClientMessage } from './chat'
import { kvSet } from './kv'
import { createConv, isLive, listPartners } from './store'
import { canPay } from './billing'
import { tgAdmin } from './tg'

export const MAX_COMPANIES = 3

// Заявка уходит до трёх компаниям раздела, у клиента с каждой свой чат. Общий путь для сайта и мессенджеров.
export async function dispatchLead(i: { cat: Category; city?: City; name: string; phone: string; text: string; acctId?: string; private?: boolean }) {
  const all = (await listPartners()).filter(p => !p.system && p.cats.includes(i.cat.slug) && isLive(p) && canPay(p, i.cat.lead))
  const local = i.city && i.city.slug !== 'podmoskove' ? all.filter(p => p.city === i.city!.slug || p.city === 'podmoskove') : all
  // Раздаём по очереди: у кого меньше принятых лидов, тот первым
  const chosen = (local.length ? local : all).sort((a, z) => a.leads - z.leads || a.createdAt - z.createdAt).slice(0, MAX_COMPANIES)

  const reqId = randomBytes(5).toString('hex')
  const sent: { slug: string; name: string; convId: string }[] = []
  for (const p of chosen) {
    const c = await createConv(p.id, i.name, i.phone, i.text, i.acctId, { cat: i.cat.slug, reqId, private: i.private })
    if (i.acctId) await attachConv(i.acctId, c.id)
    await notifyClientMessage(c, i.text, true)
    sent.push({ slug: p.slug, name: p.name, convId: c.id })
  }
  if (!sent.length) {
    const id = randomBytes(5).toString('hex')
    await kvSet(`orphan:${id}`, { id, cat: i.cat.slug, city: i.city?.slug ?? '', name: i.name, phone: i.phone, text: i.text, at: Date.now() })
    await tgAdmin(`📥 Заявка без компаний: ${i.cat.title}\n${i.name} +${i.phone}\n${i.text}`)
  }
  return sent
}
