import { accountConvs } from './account'
import { doneCount, levelFor } from './loyalty'
import type { Conv, Partner } from './store'

// Сколько заказов у этой компании выполнено для всего кабинета клиента (семьи)
export async function doneForPartner(partnerId: string, c: Conv): Promise<number> {
  const convs = c.acctId ? await accountConvs(c.acctId) : [c]
  return doneCount(convs.filter(x => x.partnerId === partnerId))
}

export async function loyaltyFor(p: Partner, c: Conv) {
  return levelFor(p.loyalty?.tiers, await doneForPartner(p.id, c))
}
