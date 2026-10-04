import type { Metadata } from 'next'
import { listAllConvs, listPartners } from '@/lib/store'

export const metadata: Metadata = { title: 'Админка', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Админ видит всю переписку без масок. Вход: /admin?key=ADMIN_KEY
export default async function Admin({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) return <p>Нет доступа</p>
  const [partners, convs] = await Promise.all([listPartners(), listAllConvs()])
  const byId = new Map(partners.map(p => [p.id, p]))
  return (
    <>
      <h1>Админка</h1>
      <p>Партнёров: {partners.length} · Диалогов: {convs.length} · Принято лидов: {partners.reduce((s, p) => s + p.leads, 0)}</p>
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
