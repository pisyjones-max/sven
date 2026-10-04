'use client'
import { useState } from 'react'
import { formatPhone } from '@/lib/phone'

// Телефон → код из SMS → готово. Используется для входа и для привязки номера к кабинету.
export function SmsCodeForm({ cta, onDone }: { cta: string; onDone: (mode: string) => void }) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [err, setErr] = useState('')
  const [dev, setDev] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(e: React.SyntheticEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/auth/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
      const j = await r.json()
      if (j.ok) { setStep('code'); if (j.dev) setDev(j.dev) }
      else setErr(j.error === 'bad_phone' ? 'Проверьте номер телефона' : j.error === 'sms_off' ? 'Вход по SMS пока не подключён' : j.error === 'too_soon' ? 'Код уже отправлен, подождите минуту' : j.error === 'limit' ? 'Слишком много попыток, попробуйте позже' : 'Не удалось отправить SMS')
    } catch { setErr('Нет связи') }
    setBusy(false)
  }

  async function verify(e: React.SyntheticEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/auth/sms/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code }) })
      const j = await r.json()
      if (j.ok) onDone(j.mode); else setErr('Неверный или устаревший код')
    } catch { setErr('Нет связи') }
    setBusy(false)
  }

  return step === 'phone' ? (
    <form className="smsf" onSubmit={send}>
      <input inputMode="tel" placeholder="+7 (___) ___-__-__" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required />
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Отправляем…' : 'Получить код'}</button>
    </form>
  ) : (
    <form className="smsf" onSubmit={verify}>
      <p className="muted small">Код отправлен на {phone}</p>
      {dev && <p className="notice bad small">Режим проверки, код: <b>{dev}</b></p>}
      <input inputMode="numeric" autoComplete="one-time-code" placeholder="Код из SMS" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} maxLength={6} required />
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Проверяем…' : cta}</button>
      <button type="button" className="link" onClick={() => { setStep('phone'); setCode('') }}>Изменить номер</button>
    </form>
  )
}
