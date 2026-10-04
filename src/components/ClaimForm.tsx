'use client'
import { useState } from 'react'
import { formatPhone } from '@/lib/phone'

export function ClaimForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    setErr('')
    try {
      const r = await fetch('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, name, phone, website: '' }) })
      const j = await r.json()
      if (j.ok) setDone(true); else setErr('Проверьте номер телефона')
    } catch { setErr('Нет связи') }
  }

  if (done) return <p className="muted small">Спасибо! Мы свяжемся с вами и подтвердим компанию.</p>
  if (!open) return <button className="link" onClick={() => setOpen(true)}>Это ваша компания? Получайте заявки здесь</button>
  return (
    <form className="claim" onSubmit={submit}>
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
      <input placeholder="Ваше имя" value={name} onChange={e => setName(e.target.value)} required />
      <input placeholder="Телефон" inputMode="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required />
      {err && <p className="err">{err}</p>}
      <button className="btn sm">Отправить</button>
    </form>
  )
}
