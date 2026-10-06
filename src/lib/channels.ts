import { createHash, createHmac } from 'crypto'
import { tgApi } from './tg'
import { kvGet, kvSet } from './kv'
import type { Ch } from './account'

// Единый интерфейс мессенджеров: бот-движок не знает, Telegram это или MAX
export type Btn = { text: string; data?: string; url?: string }
export interface Adapter {
  ch: Ch
  send(chat: string, text: string, kb?: Btn[][]): Promise<string | null>
  askPhone(chat: string, text: string): Promise<string | null>
  ack(id: string): Promise<void>
}

export const tgAdapter: Adapter = {
  ch: 'tg',
  async send(chat, text, kb) {
    const r = await tgApi('sendMessage', {
      chat_id: chat, text: text.slice(0, 3800),
      reply_markup: kb ? { inline_keyboard: kb.map(row => row.map(b => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data }))) } : { remove_keyboard: true },
    })
    return r.ok && r.result?.message_id ? String(r.result.message_id) : null
  },
  async askPhone(chat, text) {
    const r = await tgApi('sendMessage', {
      chat_id: chat, text,
      reply_markup: { keyboard: [[{ text: '📱 Отправить мой номер', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
    })
    return r.ok && r.result?.message_id ? String(r.result.message_id) : null
  },
  async ack(id) { await tgApi('answerCallbackQuery', { callback_query_id: id }) },
}

// --- MAX (по документации dev.max.ru: Authorization-заголовок, POST /messages, /answers, /subscriptions)
export const maxBase = () => (process.env.MAX_API_BASE || 'https://platform-api.max.ru').replace(/\/+$/, '')
export const maxSecret = () => process.env.MAX_WEBHOOK_SECRET || createHash('sha256').update(`${process.env.MAX_BOT_TOKEN ?? ''}:doma-max`).digest('hex').slice(0, 32)

export async function maxApi(method: 'GET' | 'POST', path: string, query: Record<string, string> = {}, body?: unknown): Promise<Record<string, unknown> | null> {
  const token = process.env.MAX_BOT_TOKEN
  if (!token) return null
  try {
    const r = await fetch(`${maxBase()}${path}${Object.keys(query).length ? `?${new URLSearchParams(query)}` : ''}`, {
      method, headers: { Authorization: token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000),
    })
    const j = (await r.json().catch(() => null)) as Record<string, unknown> | null
    if (!r.ok) console.error('[doma] MAX error', r.status, JSON.stringify(j))
    return j
  } catch (e) {
    console.error('[doma] MAX fetch failed', e)
    return null
  }
}

const maxMid = (j: Record<string, unknown> | null): string | null => {
  const m = (j?.message as { body?: { mid?: string } } | undefined)?.body?.mid
  return m ? String(m) : null
}

export const maxAdapter: Adapter = {
  ch: 'max',
  async send(chat, text, kb) {
    const attachments = kb ? [{ type: 'inline_keyboard', payload: { buttons: kb.map(row => row.map(b => (b.url ? { type: 'link', text: b.text, url: b.url } : { type: 'callback', text: b.text, payload: b.data }))) } }] : undefined
    return maxMid(await maxApi('POST', '/messages', { user_id: chat }, { text: text.slice(0, 3900), attachments }))
  },
  async askPhone(chat, text) {
    return maxMid(await maxApi('POST', '/messages', { user_id: chat }, { text, attachments: [{ type: 'inline_keyboard', payload: { buttons: [[{ type: 'request_contact', text: '📱 Отправить мой номер' }]] } }] }))
  },
  async ack(id) { await maxApi('POST', '/answers', { callback_id: id }, { notification: '✓' }) },
}

export const adapterFor = (ch: Ch) => (ch === 'tg' ? tgAdapter : maxAdapter)

// Номер из контакта MAX: подтверждён, если hash совпал с HMAC-SHA256(токен бота, vcf_info)
export function parseMaxContact(payload: { vcf_info?: string; hash?: string }): { phone: string | null; verified: boolean } {
  const vcf = String(payload.vcf_info ?? '').replace(/\\r\\n/g, '\r\n')
  const m = vcf.match(/TEL[^:\r\n]*:\+?(\d{10,15})/)
  const token = process.env.MAX_BOT_TOKEN ?? ''
  const verified = !!payload.hash && !!token && createHmac('sha256', token).update(vcf).digest('hex') === payload.hash
  return { phone: m ? m[1] : null, verified }
}

// Ответ компании в чате клиента: запоминаем сообщение, чтобы «Ответить» попало в нужный диалог
export const rememberClientMsg = (ch: Ch, chat: string, mid: string, convId: string) => kvSet(`cmsg:${ch}:${chat}:${mid}`, convId)
export const lookupClientMsg = (ch: Ch, chat: string, mid: string) => kvGet<string>(`cmsg:${ch}:${chat}:${mid}`)
