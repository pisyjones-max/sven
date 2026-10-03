'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Msg { from: 'client' | 'partner'; text: string; at: number }
interface Conv { id: string; clientName: string; clientPhone: string | null; accepted: boolean; createdAt: number; msgs: Msg[] }
interface Data { partner: { name: string; slug: string; leads: number; tgBound: boolean }; convs: Conv[] }

export function CabinetClient({ token, tgLink }: { token: string; tgLink: string | null }) {
  const [data, setData] = useState<Data | null>(null)
  const [bad, setBad] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [text, setText] = useState('')

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
      {cur ? (
        <div className="card chat">
          <button className="link" onClick={() => setOpen(null)}>← Все заявки</button>
          <h3>{cur.clientName} {cur.clientPhone ? `· +${cur.clientPhone}` : '· контакт откроется после вашего ответа'}</h3>
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
