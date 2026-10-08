'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Msg { from: 'client' | 'partner'; text: string; at: number }
interface Level { done: number; percent: number; next: { orders: number; percent: number; left: number } | null }
interface Conv { handedTo?: { name: string } | null; complaint: boolean; id: string; clientName: string; clientPhone: string | null; accepted: boolean; createdAt: number; msgs: Msg[]; done: number; level: Level | null }
interface Tier { orders: number; percent: number }
interface Billing { balance: number; prices: { title: string; lead: number }[]; ledger: { at: number; delta: number; reason: string }[]; contact: string }
interface RecRow { name: string; comment: string; at: number; uses: number }
interface Data { available?: { until: number; note?: string } | null; recs?: RecRow[]; partner: { name: string; slug: string; leads: number; tgBound: boolean; tiers: Tier[] | null }; billing: Billing | null; convs: Conv[] }

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

function AvailableBox({ token, cur, onChanged }: { token: string; cur: { until: number; note?: string } | null; onChanged: () => void }) {
  const [note, setNote] = useState('')
  async function set(body: Record<string, unknown>) {
    await fetch('/api/cabinet/available', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...body }) }).catch(() => {})
    onChanged()
  }
  return (
    <div className="card">
      <h2>{cur ? '🟢 Вы свободны' : 'Готов помочь сейчас'}</h2>
      {cur
        ? <p className="small">До {new Date(cur.until).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}{cur.note ? `: ${cur.note}` : ''}. Новые заявки в вашем районе приходят вам первым, на странице стоит отметка.</p>
        : <p className="muted small">Нажмите, когда свободны: заявки в вашем районе придут вам первым, на странице появится отметка «Свободен сейчас».</p>}
      <input placeholder="Коротко: например, с машиной, до 20 км" value={note} maxLength={120} onChange={e => setNote(e.target.value)} />
      <div className="row">
        {[2, 4, 8].map(h => <button key={h} className="btn sm" onClick={() => set({ hours: h, note })}>{h} ч</button>)}
        {cur && <button className="btn ghost sm" onClick={() => set({ off: true })}>Выключить</button>}
      </div>
    </div>
  )
}

function HandoffBox({ token, id, onDone }: { token: string; id: string; onDone: () => void }) {
  const [list, setList] = useState<{ id: string; name: string; free: boolean }[] | null>(null)
  const [busy, setBusy] = useState(false)
  async function openList() {
    const j = await fetch(`/api/cabinet/handoff?token=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}`).then(r => r.json()).catch(() => null)
    setList(j?.ok ? j.list : [])
  }
  async function send(toId: string, name: string) {
    if (!window.confirm(`Передать этот заказ: ${name}? Клиент увидит, кому вы его передали.`)) return
    setBusy(true)
    await fetch('/api/cabinet/handoff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, id, toId }) }).catch(() => {})
    setBusy(false)
    onDone()
  }
  if (!list) return <button className="link small" onClick={openList}>🔁 Передать другому</button>
  return (
    <div className="card">
      <p className="label">Кому передать (та же услуга)</p>
      {list.length === 0 && <p className="muted small">Пока нет подходящих компаний.</p>}
      {list.map(x => <button key={x.id} className="conv" disabled={busy} onClick={() => send(x.id, x.name)}>{x.free ? '🟢 ' : ''}<b>{x.name}</b></button>)}
      <button className="link small" onClick={() => setList(null)}>Отмена</button>
    </div>
  )
}

function BalanceBox({ b }: { b: Billing }) {
  return (
    <div className="card">
      <h2>Баланс: {b.balance} ₽</h2>
      <p className="small">Списывается только за принятую заявку (когда вы ответили клиенту): {b.prices.map(p => `${p.title} ${p.lead} ₽`).join(', ')}. Если заявка не по теме или спам, нажмите «Не по теме»: деньги вернутся.</p>
      {b.balance < 400 && <p className="notice bad small">Баланс заканчивается. Без денег на балансе заявки не приходят.</p>}
      <p className="small muted">Пополнение: {b.contact ? `напишите ${b.contact}` : 'напишите администратору платформы'}.</p>
      {b.ledger.length > 0 && <details><summary className="small">История</summary>{b.ledger.map((l, i) => <p key={i} className="small">{new Date(l.at).toLocaleDateString('ru-RU')} · {l.delta > 0 ? '+' : ''}{l.delta} ₽ · {l.reason}</p>)}</details>}
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
    const r = await fetch('/api/cabinet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, id: open, text: t }) }).catch(() => null)
    if (r && r.status === 402) { setText(t); window.alert('Недостаточно средств на балансе, чтобы принять заявку. Пополните баланс.') }
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
      {data.recs && data.recs.length > 0 && (
        <div className="card">
          <h2>🤝 Вас рекомендуют: {data.recs.length}</h2>
          {data.recs.map((r, i) => <p key={i} className="small"><b>{r.name}</b>{r.comment ? `: «${r.comment}»` : ''}{r.uses > 0 ? ` · пришло по этой рекомендации: ${r.uses}` : ''}</p>)}
          <p className="muted small">Эти люди вас советуют знакомым. Ответьте им быстро и по-честному: так о вас узнают новые клиенты.</p>
        </div>
      )}
      <AvailableBox token={token} cur={data.available ?? null} onChanged={load} />
      {data.billing && <BalanceBox b={data.billing} />}
      <LoyaltyBox token={token} tiers={data.partner.tiers} onChanged={load} />
      {cur ? (
        <div className="card chat">
          <button className="link" onClick={() => setOpen(null)}>← Все заявки</button>
          <h3>{cur.clientName} {cur.clientPhone ? `· +${cur.clientPhone}` : '· контакт откроется после вашего ответа'}</h3>
          {cur.done > 0 && <p className="notice ok small">Постоянный клиент: выполнено заказов {cur.done}{cur.level && cur.level.percent > 0 ? `, скидка ${cur.level.percent}%` : ''}</p>}
          {cur.handedTo && <p className="notice ok small">🔁 Заказ передан: {cur.handedTo.name}</p>}
          {cur.complaint
            ? <p className="notice bad small">Жалоба отправлена, заявка не засчитана.</p>
            : <button className="link small" onClick={complain}>🚩 Не по теме / спам</button>}
          {cur.accepted && !cur.complaint && (
            <div className="row done-row">
              <input inputMode="numeric" placeholder="Сумма работы, ₽ (необязательно)" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} />
              <button className="btn ghost sm" onClick={markDone}>Работа выполнена</button>
            </div>
          )}
          {!cur.handedTo && !cur.complaint && <HandoffBox token={token} id={cur.id} onDone={() => { setOpen(null); load() }} />}
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
