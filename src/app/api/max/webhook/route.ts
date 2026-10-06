import { NextRequest, NextResponse } from 'next/server'
import { handleBot, Incoming } from '@/lib/bot'
import { maxAdapter, maxSecret, parseMaxContact } from '@/lib/channels'

interface MaxUser { user_id: number; name?: string; first_name?: string; is_bot?: boolean }
const uname = (u?: MaxUser) => u?.first_name || u?.name || ''

// События MAX: bot_started, message_created, message_callback (формат по документации dev.max.ru)
function toIncoming(u: Record<string, unknown>): Incoming | null {
  const type = String(u.update_type ?? '')
  if (type === 'bot_started') {
    const user = u.user as MaxUser | undefined
    return user ? { chatId: String(user.user_id), name: uname(user), start: String(u.payload ?? '') } : null
  }
  if (type === 'message_callback') {
    const cb = u.callback as { callback_id?: string; payload?: string; user?: MaxUser } | undefined
    return cb?.user ? { chatId: String(cb.user.user_id), name: uname(cb.user), data: cb.payload, cbId: cb.callback_id } : null
  }
  if (type === 'message_created') {
    const m = u.message as {
      sender?: MaxUser
      body?: { text?: string; attachments?: { type: string; payload?: { vcf_info?: string; hash?: string } }[] }
      link?: { type?: string; message?: { mid?: string } }
    } | undefined
    if (!m?.sender || m.sender.is_bot) return null
    const base = { chatId: String(m.sender.user_id), name: uname(m.sender) }
    const contact = m.body?.attachments?.find(a => a.type === 'contact')
    if (contact?.payload) {
      const c = parseMaxContact(contact.payload)
      return c.phone ? { ...base, phone: c.phone, phoneVerified: c.verified } : null
    }
    const text = (m.body?.text ?? '').trim()
    if (text.startsWith('/start')) return { ...base, start: text.split(/\s+/)[1] ?? '' }
    const replyTo = m.link?.type === 'reply' ? m.link.message?.mid : undefined
    return { ...base, text, replyTo }
  }
  return null
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-max-bot-api-secret') !== maxSecret()) return NextResponse.json({ ok: false }, { status: 401 })
  const u = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const inc = u ? toIncoming(u) : null
  if (inc) await handleBot(maxAdapter, inc).catch(e => console.error('[doma] max webhook failed', e))
  return NextResponse.json({ ok: true })
}
