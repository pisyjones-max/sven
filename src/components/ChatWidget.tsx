'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { formatPhone } from '@/lib/phone'
import { addOrder } from '@/lib/orders-client'
import { TgNotify } from './TgNotify'
import { useCaptcha } from './Captcha'
import { QUICK_ASK_BUILDERS, QUICK_ASK_SERVICES } from '@/lib/questions'

interface Msg { from: 'client' | 'partner'; text: string; at: number }

export function ChatWidget({ slug, partnerName, builder = false, asks: asksProp }: { slug: string; partnerName: string; builder?: boolean; asks?: string[] }) {
  const key = `doma-chat:${slug}`
  const [convId, setConvId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [text, setText] = useState('')
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const cap = useCaptcha()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const id = localStorage.getItem(key)
        if (id) { setConvId(id); addOrder({ id, slug }) }
        else {
          fetch(`/api/me/conv?slug=${slug}`, { cache: 'no-store' }).then(r => r.json()).then(j => { if (j.id) setConvId(j.id) }).catch(() => {})
        }
      } catch { /* хранилище недоступно */ }
    }, 0)
    return () => clearTimeout(t)
  }, [key, slug])

  useEffect(() => {
    const on = () => { try { const id = localStorage.getItem(key); if (id) setConvId(id) } catch { /* ok */ } }
    window.addEventListener('doma-chat-started', on)
    return () => window.removeEventListener('doma-chat-started', on)
  }, [key])

  useEffect(() => {
    if (!convId) return
    let stop = false
    const tick = async () => {
      try {
        const r = await fetch(`/api/chat/poll?id=${convId}`, { cache: 'no-store' })
        const j = await r.json()
        if (!stop && j.ok) setMsgs(j.msgs)
      } catch { /* сеть */ }
    }
    tick()
    const t = setInterval(tick, 4000)
    return () => { stop = true; clearInterval(t) }
  }, [convId])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [msgs.length])

  async function start(e: React.SyntheticEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const r = await fetch('/api/chat/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, phone, text, consent, captcha: cap.token, website: '' }),
      })
      const j = await r.json()
      if (!j.ok) { cap.reset(); setErr(j.error === 'captcha' ? 'Подтвердите, что вы не робот' : j.error === 'rate' ? 'Слишком много попыток, попробуйте позже' : j.error === 'bad_phone' ? 'Проверьте номер телефона' : j.error === 'no_consent' ? 'Нужно согласие на обработку данных' : 'Не удалось отправить, попробуйте ещё раз') }
      else {
        try { localStorage.setItem(key, j.id) } catch { /* ok */ }
        setConvId(j.id)
        addOrder({ id: j.id, slug })
        setMsgs([{ from: 'client', text, at: Date.now() }])
        setText('')
      }
    } catch { setErr('Нет связи, попробуйте ещё раз') }
    setBusy(false)
  }

  async function send(e: React.SyntheticEvent) {
    e.preventDefault()
    const t = text.trim()
    if (!t || !convId) return
    setText('')
    setMsgs(m => [...m, { from: 'client', text: t, at: Date.now() }])
    await fetch('/api/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: convId, text: t }) }).catch(() => {})
  }

  async function quick(t: string) {
    if (convId) {
      setMsgs(m => [...m, { from: 'client', text: t, at: Date.now() }])
      await fetch('/api/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: convId, text: t }) }).catch(() => {})
    } else setText(x => (x ? `${x} ${t}` : t))
  }
  const asks = asksProp ?? (builder ? QUICK_ASK_BUILDERS : QUICK_ASK_SERVICES)
  const chips = <div className="asks">{asks.map(a => <button type="button" key={a} className="chip" onClick={() => quick(a)}>{a}</button>)}</div>

  if (!convId) {
    return (
      <form className="card chat" onSubmit={start}>
        <h3>Написать: {partnerName}</h3>
        <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
        <input placeholder="Ваше имя" value={name} onChange={e => setName(e.target.value)} required />
        <input placeholder="Телефон" inputMode="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required />
        {chips}
        <textarea placeholder="Что нужно? Адрес, размеры, сроки" rows={3} value={text} onChange={e => setText(e.target.value)} required />
        <label className="check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span>Согласен на обработку данных и хранение переписки на платформе. <Link href="/privacy">Политика</Link></span></label>
        {cap.widget}
        {err && <p className="err">{err}</p>}
        <button className="btn" disabled={busy || (cap.enabled && !cap.token)}>{busy ? 'Отправляем…' : 'Отправить'}</button>
        <p className="muted small">Переписка ведётся здесь: ответ придёт на эту страницу.</p>
      </form>
    )
  }
  return (
    <div className="card chat">
      <h3>Чат: {partnerName}</h3>
      <div className="msgs">
        {msgs.map((m, i) => <div key={i} className={`msg ${m.from}`}>{m.text}</div>)}
        <div ref={endRef} />
      </div>
      {chips}
      <form className="row" onSubmit={send}>
        <input placeholder="Сообщение" value={text} onChange={e => setText(e.target.value)} />
        <button className="btn">→</button>
      </form>
      <TgNotify />
      <p className="muted small">Ответ появится здесь. Вернитесь на эту страницу позже, чат сохранится.</p>
    </div>
  )
}
