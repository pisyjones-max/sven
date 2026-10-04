import { Conv, getPartner } from './store'
import { getCategory } from './catalog'

export async function buildOrders(convs: Conv[]) {
  const orders = []
  for (const c of convs) {
    const p = await getPartner(c.partnerId)
    if (!p) continue
    orders.push({
      id: c.id, slug: p.slug, partnerName: p.name, cat: getCategory(p.cats[0])?.title ?? '',
      createdAt: c.createdAt, accepted: c.accepted, last: c.msgs[c.msgs.length - 1]?.text.slice(0, 120) ?? '',
      rating: c.rating ? { stars: c.rating.stars, comment: c.rating.comment } : null, paid: c.paid ?? null,
    })
  }
  return orders.sort((a, b) => b.createdAt - a.createdAt)
}
