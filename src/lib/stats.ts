import { Conv, Partner } from './store'

export const HOUR = 3600_000
export const LOST_AFTER = HOUR // заявка без ответа дольше часа считается потерянной
const MSK = 3 * HOUR
export const dayKey = (t: number) => new Date(t + MSK).toISOString().slice(0, 10)
export const mskHour = (t = Date.now()) => new Date(t + MSK).getUTCHours()

// Время первого ответа компании, мс от заявки
export const firstReplyMs = (c: Conv): number | null => {
  const m = c.msgs.find(x => x.from === 'partner')
  return c.accepted && m ? Math.max(0, m.at - c.msgs[0].at) : null
}

// Одна заявка клиента уходит нескольким компаниям: группируем по reqId (для старых данных телефон + минута)
const reqKey = (c: Conv) => c.reqId ?? `${c.clientPhone}:${Math.floor(c.createdAt / 60_000)}`

export interface DayStat { day: string; requests: number; sent: number; answered: number; requestsAnswered: number; avgMin: number | null; lost: number; orphans: number }
export interface PartnerStat { id: string; name: string; received: number; answered: number; avgMin: number | null; complaints: number; charged: number; refunded: number }
export interface LostReq { key: string; at: number; clientName: string; clientPhone: string; text: string; companies: string[] }

export function realConvs(convs: Conv[], partners: Partner[]): Conv[] {
  const skip = new Set(partners.filter(p => p.system || p.demo).map(p => p.id))
  return convs.filter(c => !skip.has(c.partnerId))
}

export function dailyStats(convs: Conv[], orphanTimes: number[], days = 14, now = Date.now()): DayStat[] {
  const out = new Map<string, { reqs: Map<string, boolean>; sent: number; answered: number; resp: number[]; }>()
  for (let i = 0; i < days; i++) out.set(dayKey(now - i * 24 * HOUR), { reqs: new Map(), sent: 0, answered: 0, resp: [] })
  for (const c of convs) {
    const d = out.get(dayKey(c.createdAt))
    if (!d) continue
    const k = reqKey(c)
    d.sent++
    d.reqs.set(k, (d.reqs.get(k) ?? false) || c.accepted)
    if (c.accepted) { d.answered++; const r = firstReplyMs(c); if (r !== null) d.resp.push(r) }
  }
  const orph = new Map<string, number>()
  for (const t of orphanTimes) orph.set(dayKey(t), (orph.get(dayKey(t)) ?? 0) + 1)
  return [...out.entries()].map(([day, d]) => {
    const lost = [...d.reqs.entries()].filter(([k, ok]) => !ok && convs.some(c => reqKey(c) === k && now - c.createdAt > LOST_AFTER)).length
    return {
      day, requests: d.reqs.size + (orph.get(day) ?? 0), sent: d.sent, answered: d.answered,
      requestsAnswered: [...d.reqs.values()].filter(Boolean).length,
      avgMin: d.resp.length ? Math.round(d.resp.reduce((a, b) => a + b, 0) / d.resp.length / 60_000) : null,
      lost: lost + (orph.get(day) ?? 0), orphans: orph.get(day) ?? 0,
    }
  })
}

export function partnerStats(convs: Conv[], partners: Partner[], days = 14, now = Date.now()): PartnerStat[] {
  const from = now - days * 24 * HOUR
  const byP = new Map<string, PartnerStat & { resp: number[] }>()
  for (const p of partners) if (!p.system && !p.demo) byP.set(p.id, { id: p.id, name: p.name, received: 0, answered: 0, avgMin: null, complaints: 0, charged: 0, refunded: 0, resp: [] })
  for (const c of convs) {
    if (c.createdAt < from) continue
    const s = byP.get(c.partnerId)
    if (!s) continue
    s.received++
    if (c.accepted) { s.answered++; const r = firstReplyMs(c); if (r !== null) s.resp.push(r) }
    if (c.complaint) s.complaints++
    if (c.charged) { s.charged += c.charged; if (c.refunded) s.refunded += c.charged }
  }
  return [...byP.values()].map(({ resp, ...s }) => ({ ...s, avgMin: resp.length ? Math.round(resp.reduce((a, b) => a + b, 0) / resp.length / 60_000) : null }))
    .filter(s => s.received > 0).sort((a, b) => b.answered - a.answered || b.received - a.received)
}

// Заявки, на которые за час не ответила ни одна компания
export function lostRequests(convs: Conv[], names: Map<string, string>, now = Date.now()): LostReq[] {
  const g = new Map<string, Conv[]>()
  for (const c of convs) g.set(reqKey(c), [...(g.get(reqKey(c)) ?? []), c])
  const out: LostReq[] = []
  for (const [key, list] of g) {
    if (list.some(c => c.accepted || c.complaint)) continue
    const at = Math.min(...list.map(c => c.createdAt))
    if (now - at < LOST_AFTER) continue
    out.push({ key, at, clientName: list[0].clientName, clientPhone: list[0].clientPhone, text: list[0].msgs[0]?.text ?? '', companies: list.map(c => names.get(c.partnerId) ?? '?') })
  }
  return out.sort((a, b) => b.at - a.at)
}
