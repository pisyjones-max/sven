import type { Conv } from './store'

// Накопительные скидки: каждая компания сама решает, какую скидку даёт постоянным клиентам.
// Считаются выполненные заказы (их подтверждает компания) всех устройств одного кабинета, то есть всей семьи.
export interface Tier { orders: number; percent: number }

export const PRESETS: Record<string, { title: string; tiers: Tier[] }> = {
  soft: { title: 'Мягкая', tiers: [{ orders: 2, percent: 3 }, { orders: 5, percent: 5 }] },
  standard: { title: 'Стандарт', tiers: [{ orders: 2, percent: 3 }, { orders: 4, percent: 5 }, { orders: 7, percent: 7 }, { orders: 10, percent: 10 }] },
  generous: { title: 'Щедрая', tiers: [{ orders: 2, percent: 5 }, { orders: 4, percent: 8 }, { orders: 7, percent: 10 }, { orders: 10, percent: 15 }] },
}

export interface Level { done: number; percent: number; next: { orders: number; percent: number; left: number } | null }

export const doneCount = (convs: Conv[]) => convs.reduce((s, c) => s + (c.done?.length ?? 0), 0)

export function levelFor(tiers: Tier[] | undefined, done: number): Level | null {
  if (!tiers?.length) return null
  let percent = 0
  let next: Level['next'] = null
  for (const t of tiers) {
    if (t.orders <= done) percent = t.percent
    else if (!next) next = { orders: t.orders, percent: t.percent, left: t.orders - done }
  }
  return { done, percent, next }
}

export function parseTiers(raw: unknown): Tier[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 6) return null
  const tiers = raw.map(t => ({ orders: Number((t as Tier).orders), percent: Number((t as Tier).percent) }))
  if (tiers.some(t => !Number.isInteger(t.orders) || t.orders < 1 || t.orders > 50 || !Number.isFinite(t.percent) || t.percent < 1 || t.percent > 30)) return null
  tiers.sort((a, b) => a.orders - b.orders)
  return new Set(tiers.map(t => t.orders)).size === tiers.length ? tiers : null
}
