'use client'
import Link from 'next/link'
import { useState } from 'react'
import { CATEGORIES, CITIES, KIND_LABEL, Kind } from '@/lib/catalog'
import { formatPhone } from '@/lib/phone'
import { useCaptcha } from './Captcha'

export function RegisterForm({ catSlugs, src, defaultCats }: { catSlugs?: string[]; src?: string; defaultCats?: string[] } = {}) {
  const cap = useCaptcha()
  const [phone, setPhone] = useState('')
  const [cats, setCats] = useState<string[]>(defaultCats ?? [])
  const [city, setCity] = useState('ramenskoe')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [needCode, setNeedCode] = useState(false)
  const [dev, setDev] = useState('')
  const [done, setDone] = useState<{ slug: string; cabinet: string; tg: string | null } | null>(null)

  const toggle = (s: string) => setCats(c => (c.includes(s) ? c.filter(x => x !== s) : [...c, s]))

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const r = await fetch('/api/partner/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, cats, city, name, code, src, captcha: cap.token, website: '' }),
      })
      const j = await r.json()
      if (j.ok) setDone(j)
      else if (j.error === 'need_code') {
        // SMS подключён: отправляем код и просим ввести
        const r2 = await fetch('/api/auth/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
        const j2 = await r2.json()
        if (j2.ok || j2.error === 'too_soon') { setNeedCode(true); if (j2.dev) setDev(j2.dev); if (code) setErr('Неверный или устаревший код') }
        else setErr('Не удалось отправить SMS, попробуйте позже')
      } else { cap.reset(); setErr(j.error === 'captcha' ? 'Подтвердите, что вы не робот' : j.error === 'rate' ? 'Слишком много попыток, попробуйте позже' : j.error === 'bad_phone' ? 'Проверьте номер телефона' : j.error === 'bad_cats' ? 'Выберите хотя бы одну категорию' : j.error === 'exists' ? 'Этот номер уже зарегистрирован. Откройте бота в Telegram и нажмите /start, он пришлёт ссылку на кабинет' : 'Не удалось, попробуйте ещё раз') }
    } catch { setErr('Нет связи, попробуйте ещё раз') }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="card">
        <h2>Готово, вы на платформе</h2>
        <p>Ваша страница: <Link href={`/p/${done.slug}`}>/p/{done.slug}</Link></p>
        {done.tg && <p><a className="btn" href={done.tg}>Получать заявки в Telegram</a></p>}
        <p><a className="btn ghost" href={done.cabinet}>Открыть кабинет</a></p>
        <p className="muted small">Сохраните ссылку на кабинет: это ваш вход. Название, фото и описание можно добавить позже.</p>
      </div>
    )
  }
  return (
    <form className="card" onSubmit={submit}>
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
      <label>Телефон
        <input inputMode="tel" placeholder="+7 (___) ___-__-__" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required />
      </label>
      {(Object.keys(KIND_LABEL) as Kind[]).filter(k => !catSlugs || CATEGORIES.some(c => c.kind === k && catSlugs.includes(c.slug))).map(k => (
        <div key={k}>
          <p className="label">{KIND_LABEL[k].title}</p>
          <div className="chips">
            {CATEGORIES.filter(c => c.kind === k && (!catSlugs || catSlugs.includes(c.slug))).map(c => (
              <button type="button" key={c.slug} className={`chip ${cats.includes(c.slug) ? 'on' : ''}`} onClick={() => toggle(c.slug)}>{c.title}</button>
            ))}
          </div>
        </div>
      ))}
      <label>Район работы
        <select value={city} onChange={e => setCity(e.target.value)}>
          {CITIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </label>
      <label>Название компании <span className="muted">(необязательно)</span>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={80} />
      </label>
      {needCode && (
        <label>Код из SMS (отправили на {phone})
          <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} maxLength={6} required />
          {dev && <span className="notice bad small">Режим проверки, код: <b>{dev}</b></span>}
        </label>
      )}
      {!needCode && cap.widget}
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={busy || (cap.enabled && !needCode && !cap.token)}>{busy ? 'Создаём…' : needCode ? 'Подтвердить и создать' : 'Стать партнёром'}</button>
      <p className="muted small">Нажимая кнопку, вы соглашаетесь с <Link href="/privacy">политикой обработки данных</Link>. Платите только за принятые заявки.</p>
    </form>
  )
}
