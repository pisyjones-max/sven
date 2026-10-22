// Список и удаление компаний с сервера.
//   npm run partners                          список всех компаний (id, название, демо ли, заявки)
//   npm run partners -- remove --demo         что будет удалено: все демо-компании (проверка, ничего не удаляется)
//   npm run partners -- remove --id ID1 ID2   то же для выбранных компаний (id или slug из списка)
//   добавь --apply, чтобы удалить. Диспетчер (системная компания) не удаляется никогда.
// Вместе с компанией удаляются её заявки и переписка (они же убираются из кабинетов клиентов), страница, токен кабинета, ключи поиска.
import { existsSync, readFileSync } from 'fs'

function loadEnv() {
  for (const f of ['.env.production', '.env.local', '.env']) {
    if (!existsSync(f)) continue
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const { kvGet, kvSet, kvDel, kvScanKeys, kvIsFileBackend, kvDeferPersist, kvFlush } = await import('../src/lib/kv')
  type P = { id: string; slug: string; token: string; name: string; phone: string; city: string; cats: string[]; leads: number; demo?: boolean; system?: boolean; imported?: boolean; claimed?: boolean; createdAt: number }
  // читаем ключи напрямую, а не через listPartners: он при SEED_DEMO=1 заново создал бы демо-компании
  const ids = (await kvScanKeys('partner:*')).map(k => k.slice('partner:'.length))
  const partners = (await Promise.all(ids.map(id => kvGet<P>(`partner:${id}`)))).filter((p): p is P => !!p).sort((a, z) => a.createdAt - z.createdAt)
  const kind = (p: P) => (p.system ? 'системная' : p.demo ? 'ДЕМО' : p.imported && !p.claimed ? 'импорт' : 'обычная')

  if (args[0] !== 'remove') {
    for (const p of partners) console.log(`${p.id.padEnd(10)} ${p.slug.padEnd(28)} ${kind(p).padEnd(10)} заявок принято ${p.leads} · ${p.name} · тел ${p.phone ? '…' + p.phone.slice(-4) : '—'}`)
    console.log(`\nВсего: ${partners.length} (демо ${partners.filter(p => p.demo).length}, импорт ${partners.filter(p => p.imported && !p.claimed).length})`)
    return
  }
  const wanted = args.slice(1).filter(a => !a.startsWith('--'))
  const victims = partners.filter(p => !p.system && ((args.includes('--demo') && p.demo) || wanted.includes(p.id) || wanted.includes(p.slug)))
  if (!victims.length) { console.log('Ничего не выбрано. Используй --demo или --id <id или slug>.'); return }
  if (apply && kvIsFileBackend() && !args.includes('--site-stopped')) {
    console.error('Данные в файле на диске: остановь сайт (pm2 stop sven), запусти с --site-stopped, потом pm2 start sven. С Postgres останавливать не нужно.'); process.exit(2)
  }
  if (apply && kvIsFileBackend()) kvDeferPersist(true)

  const vset = new Set(victims.map(v => v.id))
  let convCount = 0
  const convIds = new Set<string>()
  for (const v of victims) for (const cid of (await kvGet<string[]>(`pconv:${v.id}`)) ?? []) convIds.add(cid)
  // заявки, которые остались без индекса: ищем по самим записям
  for (const k of await kvScanKeys('conv:*')) { const c = await kvGet<{ id: string; partnerId: string }>(k); if (c && vset.has(c.partnerId)) convIds.add(c.id) }
  convCount = convIds.size

  console.log(`${apply ? 'УДАЛЯЮ' : 'БУДЕТ УДАЛЕНО (проверка)'}: компаний ${victims.length}, заявок и переписок ${convCount}`)
  for (const v of victims) console.log(`  ${v.id} · ${v.slug} · ${v.name} · ${kind(v)}`)
  if (!apply) { console.log('\nНичего не удалено. Для удаления добавь --apply'); return }

  for (const v of victims) {
    for (const k of [`partner:${v.id}`, `pslug:${v.slug}`, `ptok:${v.token}`, `pconv:${v.id}`]) await kvDel(k)
    if (v.phone) { const owner = await kvGet<string>(`pphone:${v.phone}`); if (owner === v.id) await kvDel(`pphone:${v.phone}`) }
  }
  for (const cid of convIds) await kvDel(`conv:${cid}`)
  const idx = await kvGet<string[]>('convidx'); if (idx) await kvSet('convidx', idx.filter(x => !convIds.has(x)))
  for (const k of await kvScanKeys('acct:*')) {
    const a = await kvGet<{ convIds?: string[] }>(k)
    if (a?.convIds?.some(x => convIds.has(x))) await kvSet(k, { ...a, convIds: a.convIds.filter(x => !convIds.has(x)) })
  }
  if (kvIsFileBackend()) kvFlush()
  console.log('Готово. Если удалены демо-компании, убери SEED_DEMO из .env.production, иначе сайт пересоздаст их при старте.')
}
main().catch(e => { console.error('Остановлено:', e instanceof Error ? e.message : e); process.exit(1) })
