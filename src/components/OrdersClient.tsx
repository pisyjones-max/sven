'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getOrders } from '@/lib/orders-client'

interface Order { id: string; slug: string; partnerName: string; cat: string; createdAt: number; accepted: boolean; last: string; rating: { stars: number; comment: string } | null; paid: number | null }

function OrderCard({ o, onSaved }: { o: Order; onSaved: () => void }) {
  const [stars, setStars] = useState(o.rating?.stars ?? 0)
  const [comment, setComment] = useState(o.rating?.comment ?? '')
  const [paid, setPaid] = useState(o.paid != null ? String(o.paid) : '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function save() {
    if (!stars) { setMsg('Выберите оценку'); return }
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, stars, comment, paid }) })
      const j = await r.json()
      if (j.ok) { setMsg('Сохранено'); onSaved() } else setMsg('Не удалось сохранить')
    } catch { setMsg('Нет связи') }
    setBusy(false)
  }

  return (
    <div className="card order">
      <div className="order-top">
        <div>
          <Link href={`/p/${o.slug}`}><b>{o.partnerName}</b></Link>
          <span className="muted small"> · {o.cat} · {new Date(o.createdAt).toLocaleDateString('ru-RU')}</span>
        </div>
        <span className={`status ${o.accepted ? 'ok' : ''}`}>{o.accepted ? 'Компания ответила' : 'Ждём ответа'}</span>
      </div>
      <p className="muted small">{o.last}</p>
      <Link className="btn ghost sm" href={`/p/${o.slug}`}>Открыть чат</Link>
      {o.accepted ? (
        <div className="rate">
          <p className="label">{o.rating ? 'Ваша оценка (можно изменить)' : 'Оцените работу'}</p>
          <div className="star-pick">
            {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" className={n <= stars ? 'on' : ''} onClick={() => setStars(n)} aria-label={`${n} из 5`}>★</button>)}
          </div>
          <textarea rows={2} placeholder="Комментарий (необязательно)" value={comment} onChange={e => setComment(e.target.value)} maxLength={500} />
          <input inputMode="numeric" placeholder="Сколько заплатили, ₽ (необязательно)" value={paid} onChange={e => setPaid(e.target.value.replace(/\D/g, ''))} />
          <div className="row"><button className="btn sm" onClick={save} disabled={busy}>Сохранить</button>{msg && <span className="muted small">{msg}</span>}</div>
        </div>
      ) : <p className="muted small">Оценить можно после ответа компании.</p>}
    </div>
  )
}

export function OrdersClient() {
  const [orders, setOrders] = useState<Order[] | null>(null)

  const load = useCallback(async () => {
    const refs = getOrders()
    if (!refs.length) { setOrders([]); return }
    try {
      const r = await fetch(`/api/orders?ids=${refs.map(o => o.id).join(',')}`, { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) setOrders(j.orders)
    } catch { setOrders(o => o ?? []) }
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [load])

  if (!orders) return <p className="muted">Загрузка…</p>
  if (!orders.length) return <div className="card"><p>Заказов пока нет. Напишите любой компании или оставьте заявку, и они появятся здесь.</p><Link className="btn" href="/">На главную</Link></div>
  const total = orders.reduce((s, o) => s + (o.paid ?? 0), 0)
  return (
    <>
      <p className="muted">Заказов: <b>{orders.length}</b>{total > 0 && <> · Потрачено по вашим отметкам: <b>{total.toLocaleString('ru-RU')} ₽</b></>}</p>
      {orders.map(o => <OrderCard key={o.id} o={o} onSaved={load} />)}
    </>
  )
}
