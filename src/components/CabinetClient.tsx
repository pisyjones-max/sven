'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Msg { from: 'client' | 'partner'; text: string; at: number }
interface Level { done: number; percent: number; next: { orders: number; percent: number; left: number } | null }
interface Conv { complaint: boolean; id: string; clientName: string; clientPhone: string | null; accepted: boolean; createdAt: number; msgs: Msg[]; done: number; level: Level | null }
interface Tier { orders: number; percent: number }
interface Data { partner: { name: string; slug: string; leads: number; tgBound: boolean; tiers: Tier[] | null }; convs: Conv[] }

const PRESET_TITLES: Record<string, string> = { soft: 'Мягкая: 3% и 5%', standard: 'Стандарт: от 3% до 10%', generous: 'Щедрая: от 5% до 15%' }

function LoyaltyBox({ token, tiers, onChanged }: { token: string; tiers: Tier[] | null; onChanged: () => void }) {
  async function set(body: Record<string, unknown>) {
    await fetch('/api/cabinet/loyalty', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...body }) }).catch(() => {})
    onChanged()
  }
  return (
    <div className="card">
      <h2>Скидки постоянным клиентам</h2>
      {tiers
        ? <p>Сейчас: {tiers.map(t => `после ${t.orders} заказов ${t.percent}%`).join(', ')}. Скидку вы даёте сами при расчёте, мы показываем клиенту прогресс, а вам уровень клиента в заявке.</p>
        : <p className="muted">Клиенты возвращаются к тем, кто даёт накопительную скидку. Заказы всей семьи копятся вместе. Включите в один клик.</p>}
      <div className="chips">
        {Object.entries(PRESET_TITLES).map(([k, t]) => <button key={k} type="button" className="chip" onClick={() => set({ preset: k })}>{t}</button>)}
        {tiers && <button type="button" className="chip" onClick={() => set({ off: true })}>Выключить</button>}
      </div>
    </div>
  )
}

export function CabinetClient({ token, tgLink }: { token: string; tgLink: string | null }) {
  const [data, setData] = useState<Data | null>(null)
  const [bad, setBad] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [amount, setAmount] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/cabinet?token=${token}`, { cache: 'no-store' })
      if (r.status === 404) { setBad(true); return }
      const j = await r.json()
      if (j.ok) setData(j)
    } catch { /* сеть */ }
  }, [token])

  useEffect(() => {
    const t0 = setTimeout(load, 0)
    const t = setInterval(load, 5000)
    return () => { clearTimeout(t0); clearInterval(t) }
  }, [load])

  async function reply(e: React.SyntheticEvent) {
    e.preventDefault()
    const t = text.trim()
    if (!t || !open) return
    setText('')
    await fetch('/api/cabinet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, id: open, text: t }) }).catch(() => {})
    load()
  }

  async function markDone() {
    if (!open) return
    await fetch('/api/cabinet/done', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, id: open, amount }) }).catch(() => {})
    setAmount('')
    load()
  }

  async function complain() {
    if (!open || !window.confirm('Заявка не по теме или спам? Она не будет засчитана.')) return
    await fetch('/api/cabinet/complain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, id: open, reason: 'не по теме или спам' }) }).catch(() => {})
    load()
  }

  if (bad) return <p className="card">Ссылка кабинета неверна.</p>
  if (!data) return <p className="muted">Загрузка…</p>
  const cur = data.convs.find(c => c.id === open)

  return (
    <div>
      <div className="card">
        <h1>{data.partner.name}</h1>
        <p>Принятых заявок: <b>{data.partner.leads}</b> · <Link href={`/p/${data.partner.slug}`}>ваша страница</Link></p>
        {!data.partner.tgBound && tgLink && <p><a className="btn" href={tgLink}>Подключить Telegram для заявок</a></p>}
      </div>
      <LoyaltyBox token={token} tiers={data.partner.tiers} onChanged={load} />
      {cur ? (
        <div className="card chat">
          <button className="link" onClick={() => setOpen(null)}>← Все заявки</button>
          <h3>{cur.clientName} {cur.clientPhone ? `· +${cur.clientPhone}` : '· контакт откроется после вашего ответа'}</h3>
          {cur.done > 0 && <p className="notice ok small">Постоянный клиент: выполнено заказов {cur.done}{cur.level && cur.level.percent > 0 ? `, скидка ${cur.level.percent}%` : ''}</p>}
          {cur.complaint
            ? <p className="notice bad small">Жалоба отправлена, заявка не засчитана.</p>
            : <button className="link small" onClick={complain}>🚩 Не по теме / спам</button>}
          {cur.accepted && !cur.complaint && (
            <div className="row done-row">
              <input inputMode="numeric" placeholder="Сумма работы, ₽ (необязательно)" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} />
              <button className="btn ghost sm" onClick={markDone}>Работа выполнена</button>
            </div>
          )}
          <div className="msgs">
            {cur.msgs.map((m, i) => <div key={i} className={`msg ${m.from === 'partner' ? 'client' : 'partner'}`}>{m.text}</div>)}
          </div>
          <form className="row" onSubmit={reply}>
            <input placeholder="Ответить клиенту" value={text} onChange={e => setText(e.target.value)} />
            <button className="btn">→</button>
          </form>
        </div>
      ) : (
        <div className="card">
          <h2>Заявки</h2>
          {data.convs.length === 0 && <p className="muted">Пока пусто. Заявки появятся, когда клиенты напишут на вашей странице.</p>}
          {data.convs.map(c => (
            <button key={c.id} className="conv" onClick={() => setOpen(c.id)}>
              <b>{c.clientName}</b> {c.accepted ? '✅' : '🆕'}
              <span className="muted"> {c.msgs[c.msgs.length - 1].text.slice(0, 70)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
