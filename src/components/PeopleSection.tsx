'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { goal } from '@/lib/metrika'

interface Person { partnerId: string; slug: string; name: string; times: number; lastAt: number; cat: string; catSlug: string; mark: string | null; note: string }

const MARKS: [string, string][] = [['again', 'Хочу снова'], ['pricey', 'Дороговато'], ['family', 'Рекомендую близким'], ['avoid', 'Мне не подошёл']]

function PersonCard({ p, onChanged }: { p: Person; onChanged: () => void }) {
  const [rec, setRec] = useState(false)
  const [comment, setComment] = useState('')
  const [link, setLink] = useState<{ url: string; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  async function mark(m: string) {
    await fetch('/api/me/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partnerId: p.partnerId, mark: p.mark === m ? null : m }) }).catch(() => {})
    onChanged()
  }
  async function makeLink() {
    setBusy(true)
    try {
      const r = await fetch('/api/me/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partnerId: p.partnerId, comment }) })
      const j = await r.json()
      if (j.ok) { setLink(j); goal('recommend_link') }
    } catch { /* сеть */ }
    setBusy(false)
  }
  async function copy() { if (link) try { await navigator.clipboard.writeText(`${link.text}\n${link.url}`); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* буфер */ } }
  async function share() { if (link && navigator.share) try { await navigator.share({ title: p.name, text: link.text, url: link.url }) } catch { /* отмена */ } }

  return (
    <div className="card order">
      <div className="order-top">
        <div><Link href={`/p/${p.slug}`}><b>{p.name}</b></Link><span className="muted small"> · {p.cat}</span></div>
        <span className="muted small">{p.times} {p.times === 1 ? 'заказ' : p.times < 5 ? 'заказа' : 'заказов'}</span>
      </div>
      <div className="chips">
        {MARKS.map(([k, t]) => <button key={k} type="button" className={`chip ${p.mark === k ? 'on' : ''}`} onClick={() => mark(k)}>{t}</button>)}
      </div>
      <div className="row">
        <Link className="btn sm" href={`/p/${p.slug}?cat=${p.catSlug}`} onClick={() => goal('reorder_click')}>Заказать снова</Link>
        <button className="btn ghost sm" onClick={() => setRec(r => !r)}>Порекомендовать</button>
      </div>
      {rec && (
        <div>
          {!link ? (
            <>
              <textarea rows={2} maxLength={300} placeholder="Пара слов от вас (необязательно): например, «приехал в тот же день»" value={comment} onChange={e => setComment(e.target.value)} />
              <button className="btn sm" onClick={makeLink} disabled={busy}>{busy ? 'Готовим…' : 'Получить ссылку'}</button>
              <p className="muted small">Человек увидит ваше имя и комментарий. Ваши заказы, переписки и контакты он не увидит.</p>
            </>
          ) : (
            <div className="row">
              <button className="btn sm" onClick={copy}>{copied ? 'Скопировано' : 'Скопировать'}</button>
              {typeof navigator !== 'undefined' && 'share' in navigator && <button className="btn ghost sm" onClick={share}>Отправить</button>}
              <a className="btn ghost sm" href={`https://t.me/share/url?url=${encodeURIComponent(link.url)}&text=${encodeURIComponent(link.text)}`} target="_blank" rel="noopener noreferrer">Telegram</a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function PeopleSection() {
  const [people, setPeople] = useState<Person[]>([])
  const load = useCallback(async () => {
    try { const j = await (await fetch('/api/me/people', { cache: 'no-store' })).json(); if (j.ok) setPeople(j.people) } catch { /* сеть */ }
  }, [])
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t) }, [load])
  if (!people.length) return null
  return (
    <>
      <h2>Мои люди</h2>
      <p className="muted small">Те, кто вам уже помог. Отметки видите только вы и те, кто подключён к вашему кабинету. Публичного рейтинга нет: решаете вы и ваши близкие.</p>
      {people.map(p => <PersonCard key={p.partnerId} p={p} onChanged={load} />)}
    </>
  )
}
