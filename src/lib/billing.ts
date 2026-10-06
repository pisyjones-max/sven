import { kvGet, kvSet } from './kv'
import { Conv, Partner, getPartner, savePartner } from './store'
import { getCategory } from './catalog'

// Платные лиды. Включается переменной BILLING=1. Новая компания получает стартовый баланс BILLING_WELCOME (по умолчанию 1000 ₽).
export const billingOn = () => process.env.BILLING === '1'
const welcome = () => Math.max(0, Number(process.env.BILLING_WELCOME ?? 1000) || 0)

export interface LedgerRow { at: number; delta: number; reason: string; conv?: string }

export function leadPrice(c: Pick<Conv, 'cat'>, p: Pick<Partner, 'cats'>): number {
  if (c.cat) return getCategory(c.cat)?.lead ?? 0
  const prices = p.cats.map(s => getCategory(s)?.lead ?? 0).filter(x => x > 0)
  return prices.length ? Math.min(...prices) : 0
}

export const balanceOf = (p: Partner): number => p.balance ?? (billingOn() ? welcome() : 0)
export const canPay = (p: Partner, price: number) => !billingOn() || price <= 0 || balanceOf(p) >= price

async function addLedger(pid: string, row: LedgerRow) {
  const l = (await kvGet<LedgerRow[]>(`ledger:${pid}`)) ?? []
  await kvSet(`ledger:${pid}`, [row, ...l].slice(0, 200))
}
export async function getLedger(pid: string, n = 10): Promise<LedgerRow[]> {
  return ((await kvGet<LedgerRow[]>(`ledger:${pid}`)) ?? []).slice(0, n)
}

// Первое обращение к балансу: записываем стартовый бонус
async function init(p: Partner) {
  if (p.balance !== undefined) return
  p.balance = welcome()
  if (p.balance > 0) await addLedger(p.id, { at: Date.now(), delta: p.balance, reason: 'Стартовый бонус' })
}

// Списание за принятую заявку. Меняет p и c, сохраняет их вызывающий код.
export async function chargeLead(p: Partner, c: Conv): Promise<number> {
  const price = leadPrice(c, p)
  if (!billingOn() || price <= 0 || c.charged || c.complaint) return 0
  await init(p)
  p.balance = (p.balance ?? 0) - price
  c.charged = price
  await addLedger(p.id, { at: Date.now(), delta: -price, reason: 'Принятая заявка', conv: c.id })
  return price
}

// Возврат за заявку с жалобой «спам / не по теме»
export async function refundLead(c: Conv): Promise<number> {
  if (!billingOn() || !c.charged || c.refunded) return 0
  const p = await getPartner(c.partnerId)
  if (!p) return 0
  await init(p)
  p.balance = (p.balance ?? 0) + c.charged
  c.refunded = true
  await addLedger(p.id, { at: Date.now(), delta: c.charged, reason: 'Возврат: жалоба на заявку', conv: c.id })
  await savePartner(p)
  const { saveConv } = await import('./store')
  await saveConv(c)
  return c.charged
}

export async function topUp(p: Partner, amount: number, reason = 'Пополнение'): Promise<number> {
  await init(p)
  p.balance = (p.balance ?? 0) + amount
  await addLedger(p.id, { at: Date.now(), delta: amount, reason })
  await savePartner(p)
  return p.balance
}
