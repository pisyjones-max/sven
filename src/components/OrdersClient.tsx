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

interface Device { id: string; label: string; role: 'owner' | 'guest'; at: number; current: boolean }
interface Me { role?: 'owner' | 'guest'; orders: Order[]; devices?: Device[]; none?: boolean }
interface Invite { url: string; svg: string; expires: number; max: number }

function ShareCard({ devices, onChanged }: { devices: Device[]; onChanged: () => void }) {
  const [inv, setInv] = useState<Invite | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function make() {
    setBusy(true)
    try {
      const r = await fetch('/api/me/invite', { method: 'POST' })
      const j = await r.json()
      if (j.ok) setInv(j)
    } catch { /* сеть */ }
    setBusy(false)
  }
  async function copy() {
    if (!inv) return
    try { await navigator.clipboard.writeText(inv.url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* буфер недоступен */ }
  }
  async function share() {
    if (inv && navigator.share) { try { await navigator.share({ title: 'Мои заказы', text: 'Откройте, чтобы зайти в наш кабинет заказов', url: inv.url }) } catch { /* отмена */ } }
  }
  async function revoke(id: string) {
    await fetch('/api/me/device', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
    onChanged()
  }
  const guests = devices.filter(d => d.role === 'guest')

  return (
    <div className="card share">
      <h3>Поделиться кабинетом с близкими</h3>
      <p className="muted">Родитель или друг наведёт камеру на QR-код или откроет ссылку и сразу окажется здесь. Регистрация не нужна.</p>
      {!inv
        ? <button className="btn" onClick={make} disabled={busy}>{busy ? 'Готовим…' : 'Показать QR-код'}</button>
        : (
          <div className="invite">
            <div className="qr" dangerouslySetInnerHTML={{ __html: inv.svg }} />
            <div className="invite-side">
              <p className="muted small">Действует до {new Date(inv.expires).toLocaleDateString('ru-RU')}, подключить можно до {inv.max} устройств.</p>
              <button className="btn" onClick={copy}>{copied ? 'Скопировано' : 'Скопировать ссылку'}</button>
              {typeof navigator !== 'undefined' && 'share' in navigator && <button className="btn ghost" onClick={share}>Отправить</button>}
              <button className="link" onClick={make}>Сделать новую ссылку</button>
            </div>
          </div>
        )}
      {guests.length > 0 && (
        <div className="devices">
          <p className="label">Подключённые устройства</p>
          {guests.map(d => (
            <div key={d.id} className="device">
              <span>{d.label} <span className="muted small">с {new Date(d.at).toLocaleDateString('ru-RU')}</span></span>
              <button className="btn ghost sm" onClick={() => revoke(d.id)}>Отключить</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function OrdersClient({ joined, badInvite }: { joined: boolean; badInvite: boolean }) {
  const [me, setMe] = useState<Me | null>(null)

  const load = useCallback(async () => {
    try {
      const refs = getOrders()
      if (refs.length) await fetch('/api/me/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: refs.map(o => o.id) }) }).catch(() => {})
      const r = await fetch('/api/me', { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) setMe(j)
    } catch { setMe(m => m ?? { orders: [], none: true }) }
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [load])

  async function leave() {
    await fetch('/api/me/logout', { method: 'POST' }).catch(() => {})
    setMe({ orders: [], none: true })
  }

  if (!me) return <p className="muted">Загрузка…</p>
  const orders = me.orders
  const total = orders.reduce((s, o) => s + (o.paid ?? 0), 0)
  return (
    <>
      {joined && me.role === 'guest' && <div className="notice ok"><b>Готово, вы в кабинете.</b> Здесь заказы и переписки вашего близкого. Можно писать компаниям и оставлять оценки.</div>}
      {badInvite && <div className="notice bad">Ссылка устарела или уже использована. Попросите прислать новую.</div>}
      {!orders.length
        ? <div className="card"><p>Заказов пока нет. Напишите любой компании или оставьте заявку, и они появятся здесь.</p><Link className="btn" href="/">На главную</Link></div>
        : <>
            <p className="muted">Заказов: <b>{orders.length}</b>{total > 0 && <> · Потрачено по отметкам: <b>{total.toLocaleString('ru-RU')} ₽</b></>}</p>
            {orders.map(o => <OrderCard key={o.id} o={o} onSaved={load} />)}
          </>}
      {me.role === 'owner' && <ShareCard devices={me.devices ?? []} onChanged={load} />}
      {me.role === 'guest' && <p><button className="link" onClick={leave}>Выйти из этого кабинета на этом устройстве</button></p>}
    </>
  )
}
