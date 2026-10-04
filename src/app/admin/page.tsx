import type { Metadata } from 'next'
import { listAllConvs, listPartners } from '@/lib/store'
import { kvGet, kvScanKeys } from '@/lib/kv'

export const metadata: Metadata = { title: 'Админка', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Админ видит всю переписку без масок. Вход: /admin?key=ADMIN_KEY
export default async function Admin({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) return <p>Нет доступа</p>
  const [partners, convs] = await Promise.all([listPartners(), listAllConvs()])
  const orphans = (await Promise.all((await kvScanKeys('orphan:*')).map(k => kvGet<{ id: string; cat: string; name: string; phone: string; text: string; at: number }>(k)))).filter((o): o is NonNullable<typeof o> => !!o).sort((a, b) => b.at - a.at)
  const byId = new Map(partners.map(p => [p.id, p]))
  return (
    <>
      <h1>Админка</h1>
      <p>Партнёров: {partners.length} · Диалогов: {convs.length} · Принято лидов: {partners.reduce((s, p) => s + p.leads, 0)}</p>
      {orphans.length > 0 && <><h2>Заявки без компаний ({orphans.length})</h2>{orphans.map(o => <div key={o.id} className="card"><b>{o.name} +{o.phone}</b> · {o.cat}<p className="small">{o.text}</p></div>)}</>}
      <h2>Партнёры</h2>
      {partners.map(p => <div key={p.id} className="card"><b>{p.name}</b> +{p.phone} · {p.cats.join(', ')} · {p.city} · лидов: {p.leads} · TG: {p.tgChatId ? 'да' : 'нет'} · <a href={`/p/${p.slug}`}>страница</a> · <a href={`/cabinet/${p.token}`}>кабинет</a>{p.demo ? ' · тест' : ''}</div>)}
      <h2>Переписка</h2>
      {convs.map(c => (
        <div key={c.id} className="card">
          <b>{c.clientName} +{c.clientPhone}</b> → {byId.get(c.partnerId)?.name} {c.accepted ? '✅ лид' : '🆕'}
          {c.msgs.map((m, i) => <p key={i} className="small">{m.from === 'client' ? '👤' : '🏢'} {m.text}</p>)}
        </div>
      ))}
    </>
  )
}
