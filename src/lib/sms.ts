import { createHash, randomInt } from 'crypto'
import { kvGet, kvSet } from './kv'

// SMS через SMS.ru (SMS_RU_API_ID). Для проверки без оплаты: SMS_DEV=1, код пишется в лог сервера и возвращается в ответе.
export const smsEnabled = () => !!process.env.SMS_RU_API_ID || process.env.SMS_DEV === '1'
const devMode = () => process.env.SMS_DEV === '1' && !process.env.SMS_RU_API_ID

async function sendSms(phone: string, text: string): Promise<boolean> {
  const id = process.env.SMS_RU_API_ID
  if (id) {
    try {
      const r = await fetch(`https://sms.ru/sms/send?api_id=${encodeURIComponent(id)}&to=${phone}&msg=${encodeURIComponent(text)}&json=1`, { signal: AbortSignal.timeout(8000) })
      const j = (await r.json()) as { status?: string; sms?: Record<string, { status?: string }> }
      const n = j.sms?.[phone]
      return j.status === 'OK' && (!n || n.status === 'OK')
    } catch (e) {
      console.error('[doma] SMS failed', e)
      return false
    }
  }
  if (devMode()) { console.log('[doma] SMS DEV', phone, text); return true }
  return false
}

interface CodeRec { h: string; exp: number; tries: number; sentAt: number }
const hash = (phone: string, code: string) => createHash('sha256').update(`${phone}:${code}:${process.env.ADMIN_KEY ?? ''}`).digest('hex')

async function bump(key: string, max: number, windowMs: number): Promise<boolean> {
  const r = (await kvGet<{ n: number; from: number }>(key)) ?? { n: 0, from: Date.now() }
  if (Date.now() - r.from > windowMs) { r.n = 0; r.from = Date.now() }
  if (r.n >= max) return false
  r.n += 1
  await kvSet(key, r)
  return true
}

export async function issueCode(phone: string, ip: string): Promise<{ ok: true; dev?: string } | { ok: false; error: 'sms_off' | 'too_soon' | 'limit' | 'send_failed' }> {
  if (!smsEnabled()) return { ok: false, error: 'sms_off' }
  const prev = await kvGet<CodeRec>(`smscode:${phone}`)
  if (prev && Date.now() - prev.sentAt < 60_000) return { ok: false, error: 'too_soon' }
  if (!(await bump(`smsh:${phone}`, 5, 3600_000)) || !(await bump(`smsip:${ip}`, 20, 3600_000))) return { ok: false, error: 'limit' }
  const code = String(randomInt(100000, 1000000))
  await kvSet(`smscode:${phone}`, { h: hash(phone, code), exp: Date.now() + 10 * 60_000, tries: 0, sentAt: Date.now() } satisfies CodeRec)
  if (!(await sendSms(phone, `Платформа домов: код ${code}. Никому не сообщайте.`))) return { ok: false, error: 'send_failed' }
  return { ok: true, dev: devMode() ? code : undefined }
}

export async function checkCode(phone: string, code: string): Promise<boolean> {
  const rec = await kvGet<CodeRec>(`smscode:${phone}`)
  if (!rec || rec.exp < Date.now() || rec.tries >= 5) return false
  rec.tries += 1
  const ok = rec.h === hash(phone, String(code).trim())
  await kvSet(`smscode:${phone}`, ok ? { ...rec, exp: 0 } : rec) // успешный код одноразовый
  return ok
}
