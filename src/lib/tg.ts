import { createHash } from 'crypto'

const TOKEN = process.env.TG_TOKEN ?? ''
const BASE = (process.env.TG_API_BASE || 'https://api.telegram.org').replace(/\/+$/, '')
export const ADMIN_CHAT = process.env.TG_ADMIN_CHAT_ID ?? ''

export function webhookSecret(): string {
  return process.env.TG_WEBHOOK_SECRET || createHash('sha256').update(`${TOKEN}:doma-webhook`).digest('hex').slice(0, 32)
}

export async function tgApi(method: string, body: Record<string, unknown>): Promise<{ ok: boolean; result?: { message_id?: number }; description?: string }> {
  if (!TOKEN) return { ok: false, description: 'TG_TOKEN not set' }
  try {
    const res = await fetch(`${BASE}/bot${TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) console.error('[doma] TG error', res.status, JSON.stringify(j))
    return j
  } catch (e) {
    console.error('[doma] TG fetch failed', e)
    return { ok: false, description: String(e) }
  }
}

// Plain text без parse_mode: переписка клиентов не должна ломать отправку
export async function tgSend(chatId: string, text: string): Promise<number | null> {
  if (!chatId) return null
  const r = await tgApi('sendMessage', { chat_id: chatId, text: text.slice(0, 3800) })
  return r.ok ? (r.result?.message_id ?? null) : null
}

export const tgAdmin = (text: string) => (ADMIN_CHAT ? tgSend(ADMIN_CHAT, text) : Promise.resolve(null))
