'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CATEGORIES, CITIES, ICON, getCategory } from '@/lib/catalog'
import { questionsFor } from '@/lib/questions'
import { formatPhone } from '@/lib/phone'
import { addOrder } from '@/lib/orders-client'
import { TgNotify } from './TgNotify'
import { ChannelButtons } from './ChannelButtons'

interface Sent { slug: string; name: string; convId: string }
const CONTACT_KEY = 'doma-contact'

// Быстрый заказ: выбираете варианты, заявка собирается и уходит сама. Тот же сценарий есть в Telegram и MAX.
export function OrderWizard({ cat: catProp, city: cityProp, slug, cats, title = 'Быстрая заявка' }: { cat?: string; city?: string; slug?: string; cats?: string[]; title?: string }) {
  const [cat, setCat] = useState(catProp ?? '')
  const [step, setStep] = useState(catProp ? 1 : 0) // 0 = выбор раздела (если не задан), дальше вопросы, затем контакты
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState(cityProp ?? 'podmoskove')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ sent: Sent[]; chat?: boolean } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const c = JSON.parse(localStorage.getItem(CONTACT_KEY) || 'null') as { name: string; phone: string } | null
        if (c) { setName(c.name); setPhone(c.phone); setConsent(true) }
      } catch { /* ok */ }
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const catObj = getCategory(cat)
  const qs = catObj ? questionsFor(cat) : []
  const needCat = !catProp
  const first = needCat ? 0 : 1 // индексы: 0 раздел, 1..n вопросы, n+1 контакты
  const contactStep = qs.length + 1
  const total = needCat ? qs.length + 2 : qs.length + 1
  const pos = needCat ? step + 1 : step
  const list = (cats ? CATEGORIES.filter(c => cats.includes(c.slug)) : CATEGORIES).slice().sort((a, b) => Number(!!b.hot) - Number(!!a.hot))

  function pickCat(s: string) { setCat(s); setAnswers({}); setStep(1) }
  function pickAnswer(id: string, v: string) { setAnswers(a => ({ ...a, [id]: v })); setStep(s => s + 1) }
  function back() { setStep(s => Math.max(first, s - 1)) }

  async function send(e: React.SyntheticEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const body = slug
        ? { slug, cat, answers, note, name, phone, consent, website: '' }
        : { cat, city, answers, note, name, phone, consent, website: '' }
      const r = await fetch(slug ? '/api/chat/start' : '/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json()
      if (!j.ok) setErr(j.error === 'bad_phone' ? 'Проверьте номер телефона' : j.error === 'no_consent' ? 'Нужно согласие на обработку данных' : 'Не удалось отправить, попробуйте ещё раз')
      else {
        try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ name, phone })) } catch { /* ok */ }
        if (slug) {
          try { localStorage.setItem(`doma-chat:${slug}`, j.id) } catch { /* ok */ }
          addOrder({ id: j.id, slug })
          window.dispatchEvent(new CustomEvent('doma-chat-started', { detail: { slug } }))
          setDone({ sent: [], chat: true })
        } else {
          for (const s of j.sent as Sent[]) { try { localStorage.setItem(`doma-chat:${s.slug}`, s.convId) } catch { /* ok */ } addOrder({ id: s.convId, slug: s.slug }) }
          setDone({ sent: j.sent })
        }
      }
    } catch { setErr('Нет связи, попробуйте ещё раз') }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="wiz wiz-done" id="order">
        <h3>{done.chat ? 'Отправлено ✓' : done.sent.length ? `Заявка отправлена: ${done.sent.length}` : 'Заявка принята ✓'}</h3>
        {done.chat && <p>Компания ответит в чате ниже. Мы также можем написать в Telegram, когда ответят.</p>}
        {!done.chat && !done.sent.length && <p>Пока в этом разделе нет компаний. Передадим заявку, как только они появятся.</p>}
        {done.sent.length > 0 && (
          <>
            <p>Компании ответят в чате. Откройте нужную:</p>
            <div className="sent">{done.sent.map(s => <Link key={s.slug} className="btn ghost" href={`/p/${s.slug}`}>{s.name}</Link>)}</div>
          </>
        )}
        <TgNotify />
      </div>
    )
  }

  const catHead = catObj ? `${ICON[catObj.slug] ?? ''} ${catObj.title}` : ''
  return (
    <form className="wiz" id="order" onSubmit={send}>
      <div className="wiz-head"><b>{title}</b><span className="muted small">Шаг {pos} из {total}</span></div>
      <div className="wiz-bar"><i style={{ width: `${(pos / total) * 100}%` }} /></div>
      {catObj && step > 0 && <p className="wiz-cat">{catHead}</p>}

      {step === 0 && needCat && (
        <>
          <p className="wiz-q">Что нужно?</p>
          <div className="wiz-opts">{list.map(c => <button type="button" key={c.slug} className="wiz-opt" onClick={() => pickCat(c.slug)}><span>{ICON[c.slug]}</span>{c.title}</button>)}</div>
        </>
      )}

      {step >= 1 && step <= qs.length && (
        <>
          <p className="wiz-q">{qs[step - 1].title}</p>
          <div className="wiz-opts">
            {qs[step - 1].options.map(o => (
              <button type="button" key={o} className={`wiz-opt ${answers[qs[step - 1].id] === o ? 'on' : ''}`} onClick={() => pickAnswer(qs[step - 1].id, o)}>{o}</button>
            ))}
          </div>
        </>
      )}

      {step === contactStep && (
        <>
          <p className="wiz-q">Куда отправить заявку?</p>
          <div className="wiz-sum">
            {qs.map((qq, i) => answers[qq.id] && <button type="button" key={qq.id} className="wiz-chip" onClick={() => setStep(i + 1)}>{answers[qq.id]} ✎</button>)}
          </div>
          <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
          <input placeholder="Ваше имя" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required />
          <input placeholder="Телефон" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required />
          {!cityProp && !slug && (
            <select value={city} onChange={e => setCity(e.target.value)} aria-label="Район">
              {CITIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          )}
          <textarea placeholder="Комментарий, адрес (необязательно)" rows={2} value={note} onChange={e => setNote(e.target.value)} />
          <label className="check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>Согласен на обработку данных и хранение переписки. <Link href="/privacy">Политика</Link></span></label>
          {err && <p className="err">{err}</p>}
          <button className="btn big" disabled={busy}>{busy ? 'Отправляем…' : slug ? 'Отправить компании' : 'Получить предложения'}</button>
        </>
      )}

      {step > first && <button type="button" className="link" onClick={back}>← Назад</button>}
      {step === 0 || step === contactStep ? <ChannelButtons cat={cat || undefined} /> : null}
    </form>
  )
}
