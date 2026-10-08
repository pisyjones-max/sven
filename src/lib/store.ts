import { randomBytes } from 'crypto'
import { kvGet, kvSet, kvScanKeys } from './kv'
import { maskContacts } from './mask'
import { DEMO_PARTNERS } from './demo'
import { ADMIN_CHAT } from './tg'
import type { Tier } from './loyalty'

export interface Partner {
  id: string
  slug: string
  token: string // секрет кабинета и привязки Telegram
  name: string
  phone: string // 7XXXXXXXXXX
  cats: string[]
  city: string
  tgChatId?: string
  leads: number // принятые заявки
  createdAt: number
  // Необязательный профиль: заполняется позже, в кабинете
  desc?: string
  since?: number
  price?: string
  features?: string[]
  items?: { title: string; meta: string; price: string }[]
  demo?: boolean // тестовая компания: не индексируется, в sitemap не попадает
  rSum?: number // сумма оценок клиентов
  rCount?: number // число оценок
  imported?: boolean // добавлена импортом из открытого источника или от площадки-партнёра
  claimed?: boolean // владелец подтвердил компанию и получает заявки (для imported)
  source?: { name: string; url: string } // откуда данные: показываем со ссылкой
  loyalty?: { tiers: Tier[] } // скидки постоянным клиентам, которые даёт компания
  phoneVerified?: boolean // телефон подтверждён кодом из SMS
  verified?: boolean // проверена платформой (ставит админ)
  respSum?: number // сумма времени до первого ответа, мс
  respCount?: number
  system?: boolean // служебный «Диспетчер»: общий чат платформы, не показывается в каталоге
  available?: { until: number; note?: string } // «Готов помочь сейчас» до указанного времени
  balance?: number // баланс для платных лидов, ₽ (пусто = ещё не инициализирован)
  src?: string // откуда пришла регистрация (плакат, мастер, партнёр)
}

export interface Msg { from: 'client' | 'partner'; text: string; at: number }

export interface Conv {
  id: string
  partnerId: string
  clientName: string
  clientPhone: string
  accepted: boolean // партнёр ответил: заявка засчитана как лид
  createdAt: number
  msgs: Msg[]
  rating?: { stars: number; comment: string; at: number } // оценка клиента (можно исправить)
  paid?: number // сколько заплатил клиент, ₽ (по его отметке)
  acctId?: string // кабинет клиента, которому принадлежит заказ
  done?: { at: number; amount?: number }[] // выполненные работы, подтверждает компания
  complaint?: { reason: string; at: number } // компания пожаловалась: заявка не по теме или спам
  cat?: string // раздел заявки (по нему считается цена лида)
  reqId?: string // общий номер заявки клиента, которая ушла нескольким компаниям
  remindedAt?: number // компании напомнили в Telegram, что заявка без ответа
  charged?: number // списано за принятую заявку, ₽
  refunded?: boolean // списанное возвращено после жалобы
  private?: boolean // приватный заказ: подключённые близкие его не видят
  recBy?: string // кабинет, который порекомендовал эту компанию
  recName?: string // имя рекомендателя (для компании)
  handedTo?: { partnerId: string; name: string; at: number } // заказ передан другой компании
  handedFrom?: string // название компании, которая передала этот заказ
}

const rid = (n = 8) => randomBytes(n).toString('hex')

const TR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}
export function slugify(s: string): string {
  return s.toLowerCase().split('').map(ch => TR[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export async function createPartner(input: { name: string; phone: string; cats: string[]; city: string; src?: string }): Promise<Partner | 'exists'> {
  const existingId = await kvGet<string>(`pphone:${input.phone}`)
  if (existingId) {
    // Компанию с таким телефоном уже добавили импортом: владелец регистрируется и забирает страницу
    const ex = await getPartner(existingId)
    if (ex?.imported && !ex.claimed) {
      ex.claimed = true
      ex.cats = [...new Set([...ex.cats, ...input.cats])]
      await savePartner(ex)
      return ex
    }
    return 'exists'
  }
  const id = rid(6)
  const base = slugify(input.name) || input.cats[0] || 'partner'
  const slug = `${base}-${rid(2)}`
  const p: Partner = { id, slug, token: rid(16), name: input.name, phone: input.phone, cats: input.cats, city: input.city, leads: 0, createdAt: Date.now(), src: input.src }
  await savePartner(p)
  await kvSet(`pphone:${p.phone}`, p.id)
  await kvSet(`pslug:${p.slug}`, p.id)
  await kvSet(`ptok:${p.token}`, p.id)
  return p
}

export const savePartner = (p: Partner) => kvSet(`partner:${p.id}`, p)

// Тестовые компании: только при SEED_DEMO=1. Обновляются при каждом старте, счётчик лидов сохраняется.
type DemoGlobal = typeof globalThis & { __demoSeed?: Promise<void> }
function ensureDemo(): Promise<void> {
  const g = globalThis as DemoGlobal
  return (g.__demoSeed ??= (async () => {
    // Диспетчер: общий чат платформы. Сообщения идут админу в Telegram, ответ из Telegram виден клиенту на сайте.
    const sys = await kvGet<Partner>('partner:dispatch')
    const disp: Partner = { ...(sys ?? { id: 'dispatch', slug: 'dispatcher', token: rid(16), name: 'Диспетчер', phone: '', cats: [], city: 'podmoskove', leads: 0, createdAt: 1 }), system: true, tgChatId: ADMIN_CHAT || undefined }
    await kvSet('partner:dispatch', disp)
    await kvSet('pslug:dispatcher', 'dispatch')
    await kvSet(`ptok:${disp.token}`, 'dispatch')
    if (process.env.SEED_DEMO !== '1') return
    for (const d of DEMO_PARTNERS) {
      const old = await kvGet<Partner>(`partner:${d.id}`)
      await kvSet(`partner:${d.id}`, { ...d, leads: old?.leads ?? 0, tgChatId: old?.tgChatId, rSum: old?.rSum, rCount: old?.rCount, loyalty: old?.loyalty ?? d.loyalty, verified: old?.verified, respSum: old?.respSum, respCount: old?.respCount })
      await kvSet(`pslug:${d.slug}`, d.id)
      await kvSet(`ptok:${d.token}`, d.id)
    }
  })())
}

export async function getPartner(id: string) {
  await ensureDemo()
  return kvGet<Partner>(`partner:${id}`)
}

export async function getPartnerBySlug(slug: string) {
  await ensureDemo()
  const id = await kvGet<string>(`pslug:${slug}`)
  return id ? getPartner(id) : null
}
export async function getPartnerByToken(token: string) {
  await ensureDemo()
  const id = await kvGet<string>(`ptok:${token}`)
  return id ? getPartner(id) : null
}

export async function listPartners(): Promise<Partner[]> {
  await ensureDemo()
  const keys = await kvScanKeys('partner:*')
  const all = await Promise.all(keys.map(k => kvGet<Partner>(k)))
  return all.filter((p): p is Partner => !!p).sort((a, b) => b.createdAt - a.createdAt)
}

export const getConv = (id: string) => kvGet<Conv>(`conv:${id}`)
export const saveConv = (c: Conv) => kvSet(`conv:${c.id}`, c)

export async function createConv(partnerId: string, clientName: string, clientPhone: string, text: string, acctId?: string, meta?: { cat?: string; reqId?: string; private?: boolean; recBy?: string; recName?: string; handedFrom?: string }): Promise<Conv> {
  const c: Conv = { id: rid(8), partnerId, clientName, clientPhone, accepted: false, createdAt: Date.now(), msgs: [{ from: 'client', text, at: Date.now() }], acctId, cat: meta?.cat, reqId: meta?.reqId, private: meta?.private || undefined, recBy: meta?.recBy, recName: meta?.recName, handedFrom: meta?.handedFrom }
  await saveConv(c)
  const ids = (await kvGet<string[]>(`pconv:${partnerId}`)) ?? []
  await kvSet(`pconv:${partnerId}`, [c.id, ...ids].slice(0, 300))
  const all = await kvGet<string[]>('convidx')
  if (all) await kvSet('convidx', [c.id, ...all].slice(0, 5000))
  return c
}

// Последние диалоги по всей платформе (для статистики и напоминаний). Индекс создаётся при первом обращении.
export async function listRecentConvs(limit = 2000): Promise<Conv[]> {
  let ids = await kvGet<string[]>('convidx')
  if (!ids) {
    const all = await listAllConvs()
    ids = all.map(c => c.id).slice(0, 5000)
    await kvSet('convidx', ids)
  }
  const list = await Promise.all(ids.slice(0, limit).map(getConv))
  return list.filter((c): c is Conv => !!c)
}

export async function listConvs(partnerId: string): Promise<Conv[]> {
  const ids = (await kvGet<string[]>(`pconv:${partnerId}`)) ?? []
  const all = await Promise.all(ids.map(getConv))
  return all.filter((c): c is Conv => !!c)
}

export async function listAllConvs(): Promise<Conv[]> {
  const keys = await kvScanKeys('conv:*')
  const all = await Promise.all(keys.map(k => kvGet<Conv>(k)))
  return all.filter((c): c is Conv => !!c).sort((a, b) => b.createdAt - a.createdAt)
}

// Что видит партнёр: до принятия заявки контакты клиента скрыты
export function partnerView(c: Conv) {
  return {
    id: c.id,
    clientName: c.clientName,
    clientPhone: c.accepted ? c.clientPhone : null,
    accepted: c.accepted,
    complaint: !!c.complaint,
    handedTo: c.handedTo ? { name: c.handedTo.name } : null,
    createdAt: c.createdAt,
    msgs: c.msgs.map(m => (m.from === 'client' && !c.accepted ? { ...m, text: maskContacts(m.text) } : m)),
  }
}

// Привязка сообщения в Telegram → диалог (для ответа через «Ответить»)
export const rememberTgMsg = (chatId: string, msgId: number, convId: string) => kvSet(`tgmsg:${chatId}:${msgId}`, convId)
export const lookupTgMsg = (chatId: string, msgId: number) => kvGet<string>(`tgmsg:${chatId}:${msgId}`)

// Может ли компания получать заявки и отвечать в чате
export const isLive = (p: Partner) => !p.imported || !!p.claimed

export const avgRating = (p: Partner): number | null => (p.rCount ? (p.rSum ?? 0) / p.rCount : null)

// Байесовская оценка: одна пятёрка не обгоняет компанию с десятком хороших отзывов
const partnerScore = (p: Partner) => ((p.rSum ?? 0) + 4 * 4) / ((p.rCount ?? 0) + 4)

export const sortPartners = (list: Partner[]): Partner[] =>
  [...list].sort((a, b) => Number(isLive(b)) - Number(isLive(a)) || partnerScore(b) - partnerScore(a) || b.leads - a.leads || a.createdAt - b.createdAt)

export async function rateConv(id: string, stars: number, comment: string, paid?: number): Promise<'ok' | 'not_found' | 'not_accepted'> {
  const c = await getConv(id)
  if (!c) return 'not_found'
  if (!c.accepted) return 'not_accepted' // оценивать можно только после ответа компании
  const p = await getPartner(c.partnerId)
  if (!p) return 'not_found'
  const prev = c.rating?.stars ?? 0
  p.rSum = (p.rSum ?? 0) - prev + stars
  p.rCount = (p.rCount ?? 0) + (prev ? 0 : 1)
  c.rating = { stars, comment, at: Date.now() }
  if (paid !== undefined) c.paid = paid
  await saveConv(c)
  await savePartner(p)
  return 'ok'
}

export async function listReviews(partnerId: string, limit = 6) {
  const convs = await listConvs(partnerId)
  return convs
    .filter(c => c.rating && c.rating.comment)
    .sort((a, b) => b.rating!.at - a.rating!.at)
    .slice(0, limit)
    .map(c => ({ name: c.clientName.split(' ')[0], stars: c.rating!.stars, comment: c.rating!.comment, at: c.rating!.at }))
}

export interface ImportItem {
  name: string; cats: string[]; city?: string; phone?: string; desc?: string; since?: number; price?: string
  features?: string[]; items?: { title: string; meta: string; price: string }[]; source?: { name: string; url: string }
}

// Есть ли уже такая компания: по телефону или по названию в том же районе
export async function findDuplicate(name: string, phone: string | null, city: string): Promise<{ kind: 'phone' | 'name'; id: string } | null> {
  if (phone) { const id = await kvGet<string>(`pphone:${phone}`); if (id) return { kind: 'phone', id } }
  const id = await kvGet<string>(`pname:${slugify(name)}:${city}`)
  return id ? { kind: 'name', id } : null
}

// Импорт компаний из согласованного источника (JSON, CSV). Дубли по телефону или названию и району пропускаются.
// live: компания сама согласилась, заявки идут ей сразу (иначе она ждёт, пока владелец заберёт страницу).
export async function importPartnerFull(i: ImportItem, validCats: Set<string>, validCities: Set<string>, defSource?: { name: string; url: string }, opts?: { live?: boolean; src?: string }): Promise<{ status: 'created' | 'skipped' | 'invalid'; partner?: Partner }> {
  const name = String(i.name ?? '').trim().slice(0, 120)
  const cats = (Array.isArray(i.cats) ? i.cats : []).filter(c => validCats.has(c)).slice(0, 12)
  if (!name || !cats.length) return { status: 'invalid' }
  const city = i.city && validCities.has(i.city) ? i.city : 'podmoskove'
  const phone = i.phone ? (await import('./phone')).normalizePhone(String(i.phone)) : null
  if (await findDuplicate(name, phone, city)) return { status: 'skipped' }
  const nameKey = `pname:${slugify(name)}:${city}`
  const id = rid(6)
  const p: Partner = {
    id, slug: `${slugify(name) || 'company'}-${rid(2)}`, token: rid(16), name, phone: phone ?? '', cats, city, leads: 0, createdAt: Date.now(),
    desc: i.desc ? String(i.desc).slice(0, 600) : undefined, since: i.since, price: i.price ? String(i.price).slice(0, 80) : undefined,
    features: Array.isArray(i.features) ? i.features.slice(0, 8).map(x => String(x).slice(0, 120)) : undefined,
    items: Array.isArray(i.items) ? i.items.slice(0, 12) : undefined,
    imported: true, claimed: !!opts?.live, source: i.source ?? defSource, src: opts?.src,
  }
  await savePartner(p)
  if (phone) await kvSet(`pphone:${phone}`, id)
  await kvSet(nameKey, id)
  await kvSet(`pslug:${p.slug}`, id)
  await kvSet(`ptok:${p.token}`, id)
  return { status: 'created', partner: p }
}

export async function importPartner(i: ImportItem, validCats: Set<string>, validCities: Set<string>, defSource?: { name: string; url: string }): Promise<'created' | 'skipped' | 'invalid'> {
  return (await importPartnerFull(i, validCats, validCities, defSource)).status
}

export async function markDone(convId: string, partnerId: string, amount?: number): Promise<Conv | null> {
  const c = await getConv(convId)
  if (!c || c.partnerId !== partnerId || !c.accepted) return null
  const last = c.done?.[c.done.length - 1]
  if (last && Date.now() - last.at < 60_000) return c // защита от двойного нажатия
  c.done = [...(c.done ?? []), { at: Date.now(), amount }]
  await saveConv(c)
  return c
}

// Среднее время до первого ответа, мс. Показываем от трёх ответов, чтобы не вводить в заблуждение.
export const avgResponseMs = (p: Partner): number | null => ((p.respCount ?? 0) >= 3 ? (p.respSum ?? 0) / p.respCount! : null)

export async function complainConv(convId: string, partnerId: string, reason: string): Promise<boolean> {
  const c = await getConv(convId)
  if (!c || c.partnerId !== partnerId || c.complaint) return false
  c.complaint = { reason, at: Date.now() }
  await saveConv(c)
  if (c.accepted) {
    const p = await getPartner(partnerId)
    if (p) { p.leads = Math.max(0, p.leads - 1); await savePartner(p) } // заявка не засчитывается
  }
  return true
}

export async function listPublicPartners(): Promise<Partner[]> {
  return (await listPartners()).filter(p => !p.system)
}
