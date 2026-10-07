'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CATEGORIES, CITIES, KIND_LABEL, Kind } from '@/lib/catalog'
import { formatPhone } from '@/lib/phone'
import { addOrder } from '@/lib/orders-client'
import { TgNotify } from './TgNotify'
import { useCaptcha } from './Captcha'
import { goal } from '@/lib/metrika'

interface Sent { slug: string; name: string; convId: string }

export function LeadForm({ cat, city, title = 'Подберём исполнителя', sub = 'Опишите задачу, и заявка уйдёт сразу нескольким компаниям. Они ответят в чате.' }: { cat?: string; city?: string; title?: string; sub?: string }) {
  const [c, setC] = useState(cat ?? '')
  const [ct, setCt] = useState(city ?? 'podmoskove')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [text, setText] = useState('')
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ sent: Sent[]; waiting: boolean } | null>(null)
  const cap = useCaptcha()

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const r = await fetch('/api/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cat: c, city: ct, name, phone, text, consent, captcha: cap.token, website: '' }),
      })
      const j = await r.json()
      if (!j.ok) { cap.reset(); setErr(j.error === 'captcha' ? 'Подтвердите, что вы не робот' : j.error === 'rate' ? 'Слишком много попыток, попробуйте позже' : j.error === 'bad_phone' ? 'Проверьте номер телефона' : j.error === 'no_consent' ? 'Нужно согласие на обработку данных' : j.error === 'no_cat' ? 'Выберите, что нужно' : 'Не удалось отправить, попробуйте ещё раз') }
      else {
        for (const s of j.sent as Sent[]) { try { localStorage.setItem(`doma-chat:${s.slug}`, s.convId) } catch { /* ok */ } addOrder({ id: s.convId, slug: s.slug }) }
        goal('lead_sent', { form: 'lead' })
        setDone({ sent: j.sent, waiting: j.sent.length === 0 })
      }
    } catch { setErr('Нет связи, попробуйте ещё раз') }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="lform lead-done">
        <h3>{done.waiting ? 'Заявка принята' : `Заявка отправлена: ${done.sent.length}`}</h3>
        {done.waiting
          ? <p>Пока в этом разделе нет компаний. Мы передадим заявку, как только они появятся.</p>
          : <>
              <p>Компании ответят в чате. Откройте нужную, чтобы продолжить разговор:</p>
              <div className="sent">{done.sent.map(s => <Link key={s.slug} className="btn ghost" href={`/p/${s.slug}`}>{s.name}</Link>)}</div>
              <TgNotify />
              <p className="muted small">Вернитесь на страницу компании позже, переписка сохранится.</p>
            </>}
      </div>
    )
  }

  return (
    <form className="lform" onSubmit={submit}>
      <h3>{title}</h3>
      <p className="muted small">{sub}</p>
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
      {!cat && (
        <select value={c} onChange={e => setC(e.target.value)} required aria-label="Что нужно">
          <option value="" disabled>Что нужно?</option>
          {(Object.keys(KIND_LABEL) as Kind[]).map(k => (
            <optgroup key={k} label={KIND_LABEL[k].title}>
              {CATEGORIES.filter(x => x.kind === k).map(x => <option key={x.slug} value={x.slug}>{x.title}</option>)}
            </optgroup>
          ))}
        </select>
      )}
      {!city && (
        <select value={ct} onChange={e => setCt(e.target.value)} aria-label="Район">
          {CITIES.map(x => <option key={x.slug} value={x.slug}>{x.name}</option>)}
        </select>
      )}
      <input placeholder="Ваше имя" value={name} onChange={e => setName(e.target.value)} required />
      <input placeholder="Телефон" inputMode="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required />
      <textarea placeholder="Коротко о задаче (необязательно)" rows={2} value={text} onChange={e => setText(e.target.value)} />
      <label className="check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
        <span>Согласен на обработку данных и хранение переписки. <Link href="/privacy">Политика</Link></span></label>
      {cap.widget}
      {err && <p className="err">{err}</p>}
      <button className="btn big" disabled={busy || (cap.enabled && !cap.token)}>{busy ? 'Отправляем…' : 'Получить предложения'}</button>
    </form>
  )
}
