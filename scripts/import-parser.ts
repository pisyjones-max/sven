// Массовый импорт исполнителей из JSON парсера прямо на сервере, без браузера и админки.
//   npm run import:parser -- /путь/файл.json                 проверка, ничего не пишется
//   npm run import:parser -- /путь/файл.json --apply          загрузка
//   --limit N      обработать только первые N карточек (пробный запуск)
//   --resume       продолжить с места остановки (прогресс в import-progress-<файл>.json); можно и просто запустить заново: готовое пропускается
// Файл читается потоком, поэтому работают и многогигабайтные массивы; также понимается .jsonl (по карточке в строке).
// Тот же код проверки, дедупликации и обновления, что и у админки (src/lib/yandex-import.ts).
import { existsSync, readFileSync, writeFileSync, statSync } from 'fs'
import { cardsFrom } from '../src/lib/stream-json'

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
  const file = args.find(a => !a.startsWith('--'))
  const apply = args.includes('--apply')
  const batchSize = Number(args[args.indexOf('--batch') + 1]) || 500
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) || 0 : 0
  const progressFile = file ? `import-progress-${file.replace(/[^a-zA-Z0-9]+/g, '_').slice(-60)}.json` : ''
  let skipFirst = 0
  if (args.includes('--resume') && existsSync(progressFile)) skipFirst = JSON.parse(readFileSync(progressFile, 'utf8')).done ?? 0
  if (!file || !existsSync(file)) { console.error('Укажи существующий файл: npm run import:parser -- /путь/файл.json [--apply]'); process.exit(2) }

  const { importParserCards } = await import('../src/lib/yandex-import')
  const { sourceKey } = await import('../src/lib/yandex-card')
  const { kvDeferPersist, kvFlush, kvIsFileBackend } = await import('../src/lib/kv')
  const fileBackend = kvIsFileBackend()
  if (apply && fileBackend && !args.includes('--site-stopped')) {
    console.error('Данные лежат в файле на диске (DATA_DIR). Работающий сайт держит свою копию в памяти и затрёт импорт.\nОстанови сайт (pm2 stop sven), запусти импорт с флагом --site-stopped, потом pm2 start sven.\nС Upstash Redis (KV_REST_API_URL) останавливать ничего не нужно.')
    process.exit(2)
  }
  if (apply && fileBackend) kvDeferPersist(true)

  console.log(`Файл: ${file}, ${(statSync(file).size / 1e6).toFixed(1)} МБ${skipFirst ? `, продолжаю с карточки ${skipFirst + 1}` : ''}${limit ? `, лимит ${limit}` : ''}`)
  const rubrics = new Map<string, Record<string, number>>()
  const tally = (raw: unknown, status: string) => {
    const cats = (raw as { categories?: { path?: string }[] } | null)?.categories
    const r = (Array.isArray(cats) && typeof cats[0]?.path === 'string' ? cats[0].path.split('/')[0] : '(нет категории)')
    const t = rubrics.get(r) ?? {}; t[status] = (t[status] ?? 0) + 1; rubrics.set(r, t)
  }
  const total = { created: 0, updated: 0, unchanged: 0, skipped: 0, invalid: 0 }
  const problems: { n: number; id?: string; name?: string; status: string; note?: string }[] = []
  const seen = new Set<string>(), inFile = new Set<string>()
  let n = 0, batch: { raw: unknown; n: number }[] = [], sinceFlush = 0
  const t0 = Date.now()

  const flushBatch = async () => {
    if (!batch.length) return
    const r = await importParserCards(batch.map(b => b.raw), apply, seen)
    // сбой записи (база недоступна, диск, сеть): останавливаемся, прогресс не двигаем, после починки --resume повторит эту пачку
    const broken = r.rows.find(row => row.note?.startsWith('ошибка записи'))
    if (apply && broken) throw new Error(`${broken.note}. Остановлено на пачке, которая заканчивается карточкой №${batch[batch.length - 1].n}; прогресс сохранён до неё`)
    for (const row of r.rows) {
      total[row.status]++; tally(batch[row.n].raw, row.status)
      if (row.status === 'invalid' || row.status === 'skipped' || (row.note && row.status !== 'unchanged')) problems.push({ ...row, n: batch[row.n].n })
    }
    sinceFlush += batch.length; batch = []
    if (apply) writeFileSync(progressFile, JSON.stringify({ file, done: n - 0, at: new Date().toISOString() }))
    if (apply && fileBackend && sinceFlush >= 2000) { kvFlush(); sinceFlush = 0 }
    process.stdout.write(`\r${n} карточек · новых ${total.created} · обновлений ${total.updated} · без изменений ${total.unchanged} · пропущено ${total.skipped} · ошибок ${total.invalid}   `)
  }

  for await (const text of cardsFrom(file)) {
    n++
    if (n <= skipFirst) continue
    if (limit && n > limit) { n--; break }
    let raw: unknown
    try { raw = JSON.parse(text) } catch (e) { total.invalid++; tally(null, 'invalid'); problems.push({ n, status: 'invalid', note: `не JSON: ${e instanceof Error ? e.message : ''}` }); continue }
    const k = sourceKey(raw), key = k ? `${k.source}:${k.id}` : ''
    if (key && inFile.has(key)) { total.skipped++; tally(raw, 'skipped'); problems.push({ n, id: k?.id, status: 'skipped', note: 'повтор в файле: учтена первая карточка' }); continue }
    if (key) inFile.add(key)
    batch.push({ raw, n })
    if (batch.length >= batchSize) await flushBatch()
  }
  await flushBatch()
  if (apply && fileBackend) kvFlush()
  if (apply) writeFileSync(progressFile, JSON.stringify({ file, done: n, finished: !limit, at: new Date().toISOString() }))

  const report = `import-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(report, JSON.stringify({ file, apply, total, seconds: Math.round((Date.now() - t0) / 1000), problems }, null, 1))
  console.log('\nПо рубрикам Яндекса (новых / обновлений / без изменений / пропущено / ошибок):')
  for (const [r, t] of [...rubrics].sort((a, z) => Object.values(z[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0)))
    console.log(`  ${r.padEnd(34)} ${t.created ?? 0} / ${t.updated ?? 0} / ${t.unchanged ?? 0} / ${t.skipped ?? 0} / ${t.invalid ?? 0}`)
  const why = new Map<string, number>(); for (const p of problems) { const k = (p.note ?? '').replace(/:.*/, '').slice(0, 60); why.set(k, (why.get(k) ?? 0) + 1) }
  console.log('Причины пропусков и ошибок:', [...why].sort((a, z) => z[1] - a[1]).slice(0, 8).map(([k, v]) => `${k || '—'} ${v}`).join('; ') || 'нет')
  console.log(`\n${apply ? 'ЗАГРУЖЕНО' : 'ПРОВЕРКА (ничего не записано)'}: карточек ${n}, новых ${total.created}, обновлений ${total.updated}, без изменений ${total.unchanged}, пропущено ${total.skipped}, ошибок ${total.invalid}\nОтчёт: ${report}`)
}

main().catch(e => { console.error('\nОстановлено:', e instanceof Error ? e.message : e, '\nУже записанное остаётся, повторный запуск безопасен.'); process.exit(1) })
