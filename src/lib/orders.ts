import { Conv, getPartner } from './store'
import { getCategory } from './catalog'
import { doneCount, levelFor } from './loyalty'

export async function buildOrders(convs: Conv[], role?: 'owner' | 'guest') {
  const orders = []
  if (role === 'guest') convs = convs.filter(c => !c.private) // приватные заказы близкие не видят
  for (const c of convs) {
    const p = await getPartner(c.partnerId)
    if (!p || p.system) continue
    orders.push({
      id: c.id, partnerId: p.id, private: !!c.private, slug: p.slug, partnerName: p.name, cat: getCategory(c.cat ?? p.cats[0])?.title ?? '', catSlug: c.cat ?? p.cats[0],
      createdAt: c.createdAt, accepted: c.accepted, last: c.msgs[c.msgs.length - 1]?.text.slice(0, 120) ?? '',
      loyalty: levelFor(p.loyalty?.tiers, doneCount(convs.filter(x => x.partnerId === c.partnerId))),
      times: convs.filter(x => x.partnerId === c.partnerId && x.accepted).length,
      rating: c.rating ? { stars: c.rating.stars, comment: c.rating.comment } : null, paid: c.paid ?? null,
    })
  }
  return orders.sort((a, b) => b.createdAt - a.createdAt)
}
