import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { kvGet, kvSet } from './kv'
import { Conv, getConv, saveConv } from './store'
import { SITE_URL } from './site'

// Кабинет клиента без регистрации. Первый заказ создаёт кабинет и ставит cookie.
// Близкие подключаются по QR-коду или ссылке, владелец может отключить любое устройство.
export const COOKIE = 'doma_sid'
export const INVITE_TTL = 3 * 24 * 3600 * 1000
export const INVITE_MAX_USES = 5

export interface Account { id: string; createdAt: number; convIds: string[]; phone?: string; tgChatIds?: string[]; maxChatIds?: string[] }
export interface Session { id: string; token: string; acctId: string; role: 'owner' | 'guest'; label: string; at: number; lastSeen: number; revoked?: boolean }
export interface Invite { token: string; acctId: string; exp: number; uses: number; max: number }

const rid = (n = 8) => randomBytes(n).toString('hex')
export const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, secure: SITE_URL.startsWith('https'), path: '/', maxAge: 60 * 60 * 24 * 365 }

export function deviceLabel(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return 'Планшет'
  if (/iPhone|Android|Mobile/i.test(ua)) return 'Телефон'
  return 'Компьютер'
}

export async function currentSession(): Promise<Session | null> {
  const t = (await cookies()).get(COOKIE)?.value
  if (!t) return null
  const s = await kvGet<Session>(`sess:${t}`)
  return s && !s.revoked ? s : null
}

async function newSession(acctId: string, role: Session['role'], label: string): Promise<Session> {
  const s: Session = { id: rid(4), token: rid(16), acctId, role, label, at: Date.now(), lastSeen: Date.now() }
  await kvSet(`sess:${s.token}`, s)
  const list = (await kvGet<string[]>(`acctsess:${acctId}`)) ?? []
  await kvSet(`acctsess:${acctId}`, [s.token, ...list])
  return s
}

// Есть сессия: берём её. Нет: создаём кабинет и первое устройство-владельца.
export async function ensureAccount(ua = ''): Promise<Session> {
  const cur = await currentSession()
  if (cur) return cur
  const acct: Account = { id: rid(6), createdAt: Date.now(), convIds: [] }
  await kvSet(`acct:${acct.id}`, acct)
  const s = await newSession(acct.id, 'owner', deviceLabel(ua))
  ;(await cookies()).set(COOKIE, s.token, cookieOpts)
  return s
}

export async function attachConv(acctId: string, convId: string, force = false): Promise<boolean> {
  const a = await kvGet<Account>(`acct:${acctId}`)
  const c = await getConv(convId)
  if (!a || !c || (!force && c.acctId && c.acctId !== acctId)) return false
  if (!a.convIds.includes(convId)) { a.convIds.unshift(convId); await kvSet(`acct:${acctId}`, a) }
  if (c.acctId !== acctId) { c.acctId = acctId; await saveConv(c) }
  return true
}

export async function accountConvs(acctId: string): Promise<Conv[]> {
  const a = await kvGet<Account>(`acct:${acctId}`)
  const all = await Promise.all((a?.convIds ?? []).map(getConv))
  return all.filter((c): c is Conv => !!c)
}

export async function listSessions(acctId: string): Promise<Session[]> {
  const tokens = (await kvGet<string[]>(`acctsess:${acctId}`)) ?? []
  const all = await Promise.all(tokens.map(t => kvGet<Session>(`sess:${t}`)))
  return all.filter((s): s is Session => !!s && !s.revoked)
}

export async function revokeSession(acctId: string, sid: string): Promise<boolean> {
  const tokens = (await kvGet<string[]>(`acctsess:${acctId}`)) ?? []
  for (const t of tokens) {
    const s = await kvGet<Session>(`sess:${t}`)
    if (s && s.id === sid && s.role === 'guest') { await kvSet(`sess:${t}`, { ...s, revoked: true }); return true }
  }
  return false
}

export async function createInvite(acctId: string): Promise<Invite> {
  const inv: Invite = { token: rid(12), acctId, exp: Date.now() + INVITE_TTL, uses: 0, max: INVITE_MAX_USES }
  await kvSet(`invite:${inv.token}`, inv)
  return inv
}

// Подключение по приглашению: новое устройство-гость, а его прежние заказы переезжают в общий кабинет
export async function joinWithInvite(token: string, ua: string): Promise<boolean> {
  const inv = await kvGet<Invite>(`invite:${token}`)
  if (!inv || inv.exp < Date.now() || inv.uses >= inv.max) return false
  const acct = await kvGet<Account>(`acct:${inv.acctId}`)
  if (!acct) return false
  const prev = await currentSession()
  if (prev && prev.acctId === inv.acctId) return true
  if (prev) for (const c of await accountConvs(prev.acctId)) await attachConv(inv.acctId, c.id).catch(() => false)
  const s = await newSession(inv.acctId, 'guest', deviceLabel(ua))
  inv.uses += 1
  await kvSet(`invite:${token}`, inv)
  ;(await cookies()).set(COOKIE, s.token, cookieOpts)
  return true
}

export const getAccount = (id: string) => kvGet<Account>(`acct:${id}`)

export async function accountByPhone(phone: string): Promise<Account | null> {
  const id = await kvGet<string>(`aphone:${phone}`)
  return id ? getAccount(id) : null
}

export async function bindPhone(acctId: string, phone: string) {
  const a = await getAccount(acctId)
  if (!a) return
  a.phone = phone
  await kvSet(`acct:${acctId}`, a)
  await kvSet(`aphone:${phone}`, acctId)
}

export async function createAccount(): Promise<Account> {
  const a: Account = { id: rid(6), createdAt: Date.now(), convIds: [] }
  await kvSet(`acct:${a.id}`, a)
  return a
}

// Вход владельцем на этом устройстве (после подтверждения телефона кодом)
export async function loginAs(acctId: string, ua: string): Promise<Session> {
  const s = await newSession(acctId, 'owner', deviceLabel(ua))
  ;(await cookies()).set(COOKIE, s.token, cookieOpts)
  return s
}

// Заказы одного кабинета переезжают в другой (человек подтвердил номер, к которому уже привязан кабинет)
export async function mergeInto(targetId: string, fromId: string) {
  if (targetId === fromId) return
  for (const c of await accountConvs(fromId)) await attachConv(targetId, c.id, true)
  const from = await getAccount(fromId)
  if (!from) return
  for (const chat of from.tgChatIds ?? []) await bindChat('tg', targetId, chat)
  for (const chat of from.maxChatIds ?? []) await bindChat('max', targetId, chat)
}

export type Ch = 'tg' | 'max'

// Чат клиента в мессенджере привязан к кабинету: ответы компаний приходят туда
export async function bindChat(ch: Ch, acctId: string, chatId: string) {
  const a = await getAccount(acctId)
  if (!a) return
  const field = ch === 'tg' ? 'tgChatIds' : 'maxChatIds'
  a[field] = [...new Set([...(a[field] ?? []), chatId])]
  await kvSet(`acct:${acctId}`, a)
  await kvSet(`chacct:${ch}:${chatId}`, acctId)
}

export async function chatAccount(ch: Ch, chatId: string): Promise<string | null> {
  const id = await kvGet<string>(`chacct:${ch}:${chatId}`)
  return id && (await getAccount(id)) ? id : null
}

export async function createTgBind(acctId: string): Promise<string> {
  const token = rid(8)
  await kvSet(`cbind:${token}`, { acctId, exp: Date.now() + 3600_000 })
  return token
}

export async function bindFromToken(ch: Ch, token: string, chatId: string): Promise<boolean> {
  const b = await kvGet<{ acctId: string; exp: number }>(`cbind:${token}`)
  if (!b || b.exp < Date.now() || !(await getAccount(b.acctId))) return false
  await bindChat(ch, b.acctId, chatId)
  return true
}
export const bindTelegram = (token: string, chatId: string) => bindFromToken('tg', token, chatId)

export const maskPhone = (p: string) => `+${p[0]} ••• ••• ${p.slice(-4, -2)}-${p.slice(-2)}`
