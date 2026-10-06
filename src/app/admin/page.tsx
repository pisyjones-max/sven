import type { Metadata } from 'next'
import Link from 'next/link'
import { existsSync, readdirSync, statSync } from 'fs'
import { listPartners, listRecentConvs } from '@/lib/store'
import { kvGet, kvScanKeys } from '@/lib/kv'
import { dailyStats, lostRequests, partnerStats, realConvs } from '@/lib/stats'
import { balanceOf, billingOn } from '@/lib/billing'
import { BalanceTool, CsvImport } from '@/components/AdminTools'

export const metadata: Metadata = { title: 'Админка', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Админ видит всю переписку без масок. Вход: /admin?key=ADMIN_KEY
export default async function Admin({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) return <p>Нет доступа</p>
  const [partners, convs] = await Promise.all([listPartners(), listRecentConvs(500)])
  const orphans = (await Promise.all((await kvScanKeys('orphan:*')).map(k => kvGet<{ id: string; cat: string; name: string; phone: string; text: string; at: number }>(k)))).filter((o): o is NonNullable<typeof o> => !!o).sort((a, b) => b.at - a.at)
  const claims = (await Promise.all((await kvScanKeys('claim:*')).map(k => kvGet<{ id: string; slug: string; partner: string; name: string; phone: string; at: number }>(k)))).filter((o): o is NonNullable<typeof o> => !!o).sort((a, b) => b.at - a.at)
  const byId = new Map(partners.map(p => [p.id, p]))
  const real = realConvs(await listRecentConvs(5000), partners)
  const days = dailyStats(real, orphans.map(o => o.at))
  const lost = lostRequests(real, new Map(partners.map(p => [p.id, p.name]))).slice(0, 20)
  const pStats = partnerStats(real, partners)
  const real_partners = partners.filter(p => !p.system && !p.demo)
  const bySrc = new Map<string, number>()
  for (const p of real_partners) bySrc.set(p.src ?? 'нет', (bySrc.get(p.src ?? 'нет') ?? 0) + 1)
  const bdir = process.env.DATA_DIR ? `${process.env.DATA_DIR.replace(/\/$/, '')}/backups` : '/var/www/sven-data/backups'
  const bfiles = existsSync(bdir) ? readdirSync(bdir).filter(f => f.startsWith('kv-')).map(f => ({ f, t: statSync(`${bdir}/${f}`).mtimeMs })).sort((a, b) => b.t - a.t) : []
  const fmt = (t: number) => new Date(t).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  return (
    <>
      <h1>Админка</h1>
      <p>Партнёров: {partners.length} · Диалогов: {convs.length} · Принято лидов: {partners.reduce((s, p) => s + p.leads, 0)}</p>
      <h2>По дням (14 дней, МСК)</h2>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="small" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th align="left">День</th><th>Заявок</th><th>С ответом</th><th>Отправок компаниям</th><th>Ответов</th><th>Ср. ответ, мин</th><th>Потеряно</th></tr></thead>
          <tbody>{days.map(d => <tr key={d.day} style={{ textAlign: 'center' }}><td align="left">{d.day.slice(5)}</td><td>{d.requests}</td><td>{d.requestsAnswered}</td><td>{d.sent}</td><td>{d.answered}</td><td>{d.avgMin ?? '—'}</td><td style={d.lost ? { color: '#DC2626', fontWeight: 700 } : undefined}>{d.lost}</td></tr>)}</tbody>
        </table>
      </div>
      <h2>Потерянные заявки: без ответа больше часа ({lost.length})</h2>
      {lost.length === 0 ? <p className="small muted">Таких нет.</p> : lost.map(l => <div key={l.key} className="card"><b>{l.clientName} +{l.clientPhone}</b> · {fmt(l.at)}<p className="small">{l.text}</p><p className="small muted">Компании: {l.companies.join(', ')}</p></div>)}
      <h2>Лиды по компаниям (14 дней)</h2>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="small" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th align="left">Компания</th><th>Получено</th><th>Принято</th><th>Ср. ответ, мин</th><th>Жалобы</th>{billingOn() && <><th>Списано, ₽</th><th>Возврат, ₽</th></>}</tr></thead>
          <tbody>{pStats.map(s => <tr key={s.id} style={{ textAlign: 'center' }}><td align="left">{s.name}</td><td>{s.received}</td><td>{s.answered}</td><td>{s.avgMin ?? '—'}</td><td>{s.complaints}</td>{billingOn() && <><td>{s.charged}</td><td>{s.refunded}</td></>}</tr>)}</tbody>
        </table>
        {pStats.length === 0 && <p className="small muted">Пока нет заявок.</p>}
      </div>
      <h2>Набор мастеров</h2>
      <p className="small">Откуда регистрации: {[...bySrc.entries()].map(([k, v]) => `${k}: ${v}`).join(' · ') || 'пока нет'} · Всего компаний: {real_partners.length} · С Telegram: {real_partners.filter(p => p.tgChatId).length}</p>
      <p className="small"><Link href="/master/poster">Плакат с QR</Link> · <Link href="/master/memo">Памятка для разговора</Link> · <Link href="/master">Страница для мастеров</Link></p>
      <CsvImport adminKey={key ?? ''} />
      {billingOn() && <BalanceTool adminKey={key ?? ''} partners={real_partners.map(p => ({ slug: p.slug, name: p.name, balance: balanceOf(p) }))} />}
      <h2>Копия базы</h2>
      <p className="small">{bfiles.length ? `Последняя: ${fmt(bfiles[0].t)}, всего копий: ${bfiles.length}` : 'Копий пока нет (cron ставится при обновлении: bash deploy/update.sh)'}</p>
      {orphans.length > 0 && <><h2>Заявки без компаний ({orphans.length})</h2>{orphans.map(o => <div key={o.id} className="card"><b>{o.name} +{o.phone}</b> · {o.cat}<p className="small">{o.text}</p></div>)}</>}
      {claims.length > 0 && <><h2>Хотят забрать компанию ({claims.length})</h2>{claims.map(o => <div key={o.id} className="card"><b>{o.partner}</b>: {o.name} +{o.phone} · <a href={`/p/${o.slug}`}>страница</a></div>)}</>}
      <h2>Партнёры</h2>
      {partners.map(p => <div key={p.id} className="card"><b>{p.name}</b> +{p.phone}{billingOn() && !p.system ? ` · баланс ${balanceOf(p)} ₽` : ''} · {p.cats.join(', ')} · {p.city} · лидов: {p.leads} · TG: {p.tgChatId ? 'да' : 'нет'} · <a href={`/p/${p.slug}`}>страница</a> · <a href={`/cabinet/${p.token}`}>кабинет</a>{p.demo ? ' · тест' : ''}{p.phoneVerified ? ' · тел. подтверждён' : ''}{p.verified ? ' · ПРОВЕРЕНА' : ''} · <a href={`/api/admin/verify?key=${encodeURIComponent(key ?? '')}&slug=${p.slug}&on=${p.verified ? 0 : 1}`}>{p.verified ? 'снять проверку' : 'проверить'}</a>{p.imported ? (p.claimed ? ' · импорт, забрана' : ' · импорт') : ''}{p.rCount ? ` · ★ ${((p.rSum ?? 0) / p.rCount).toFixed(1)} (${p.rCount})` : ''}</div>)}
      <h2>Переписка (последние 500)</h2>
      {convs.map(c => (
        <div key={c.id} className="card">
          <b>{c.clientName} +{c.clientPhone}</b> → {byId.get(c.partnerId)?.name} {c.accepted ? '✅ лид' : '🆕'}{c.complaint ? ` 🚩 жалоба: ${c.complaint.reason}` : ''}
          {c.msgs.map((m, i) => <p key={i} className="small">{m.from === 'client' ? '👤' : '🏢'} {m.text}</p>)}
        </div>
      ))}
    </>
  )
}
