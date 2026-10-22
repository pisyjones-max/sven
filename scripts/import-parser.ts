// Массовый импорт исполнителей из JSON парсера прямо на сервере, без браузера и админки.
//   npm run import:parser -- /путь/файл.json                 проверка, ничего не пишется
//   npm run import:parser -- /путь/файл.json --apply          загрузка
// Файл читается потоком, поэтому работают и многогигабайтные массивы; также понимается .jsonl (по карточке в строке).
// Тот же код проверки, дедупликации и обновления, что и у админки (src/lib/yandex-import.ts).
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'fs'

function loadEnv() {
  for (const f of ['.env.production', '.env.local', '.env']) {
    if (!existsSync(f)) continue
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

// Потоковый разбор: JSON-массив объектов или JSONL. Отдаёт каждую карточку отдельной строкой JSON.
async function* cardsFrom(path: string): AsyncGenerator<string> {
  const stream = createReadStream(path, { encoding: 'utf8', highWaterMark: 1 << 20 })
  const jsonl = path.endsWith('.jsonl') || path.endsWith('.ndjson')
  let depth = 0, inStr = false, esc = false, buf = '', started = false, line = ''
  for await (const chunk of stream as AsyncIterable<string>) {
    if (jsonl) {
      line += chunk
      const parts = line.split('\n'); line = parts.pop() ?? ''
      for (const p of parts) if (p.trim()) yield p
      continue
    }
    let from = 0
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i]
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue }
      if (ch === '"') { inStr = true; continue }
      if (ch === '{' || ch === '[') {
        if (!started && ch === '[' && depth === 0) { started = true; from = i + 1; continue }
        if (depth === 0) { buf = ''; from = i }
        depth++
      } else if (ch === '}' || ch === ']') {
        depth--
        if (depth === 0) { yield buf + chunk.slice(from, i + 1); buf = '' }
      }
    }
    if (depth > 0) buf += chunk.slice(from)
  }
  if (jsonl && line.trim()) yield line
  if (!jsonl && !started) throw new Error('Ожидается JSON-массив карточек')
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const file = args.find(a => !a.startsWith('--'))
  const apply = args.includes('--apply')
  const batchSize = Number(args[args.indexOf('--batch') + 1]) || 500
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

  const total = { created: 0, updated: 0, unchanged: 0, skipped: 0, invalid: 0 }
  const problems: { n: number; id?: string; name?: string; status: string; note?: string }[] = []
  const seen = new Set<string>(), inFile = new Set<string>()
  let n = 0, batch: { raw: unknown; n: number }[] = [], sinceFlush = 0
  const t0 = Date.now()

  const flushBatch = async () => {
    if (!batch.length) return
    const r = await importParserCards(batch.map(b => b.raw), apply, seen)
    for (const row of r.rows) {
      total[row.status]++
      if (row.status === 'invalid' || row.status === 'skipped' || (row.note && row.status !== 'unchanged')) problems.push({ ...row, n: batch[row.n].n })
    }
    sinceFlush += batch.length; batch = []
    if (apply && fileBackend && sinceFlush >= 2000) { kvFlush(); sinceFlush = 0 }
    process.stdout.write(`\r${n} карточек · новых ${total.created} · обновлений ${total.updated} · без изменений ${total.unchanged} · пропущено ${total.skipped} · ошибок ${total.invalid}   `)
  }

  for await (const text of cardsFrom(file)) {
    n++
    let raw: unknown
    try { raw = JSON.parse(text) } catch (e) { total.invalid++; problems.push({ n, status: 'invalid', note: `не JSON: ${e instanceof Error ? e.message : ''}` }); continue }
    const k = sourceKey(raw), key = k ? `${k.source}:${k.id}` : ''
    if (key && inFile.has(key)) { total.skipped++; problems.push({ n, id: k?.id, status: 'skipped', note: 'повтор в файле: учтена первая карточка' }); continue }
    if (key) inFile.add(key)
    batch.push({ raw, n })
    if (batch.length >= batchSize) await flushBatch()
  }
  await flushBatch()
  if (apply && fileBackend) kvFlush()

  const report = `import-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(report, JSON.stringify({ file, apply, total, seconds: Math.round((Date.now() - t0) / 1000), problems }, null, 1))
  console.log(`\n${apply ? 'ЗАГРУЖЕНО' : 'ПРОВЕРКА (ничего не записано)'}: карточек ${n}, новых ${total.created}, обновлений ${total.updated}, без изменений ${total.unchanged}, пропущено ${total.skipped}, ошибок ${total.invalid}\nОтчёт: ${report}`)
}

main().catch(e => { console.error('\nОстановлено:', e instanceof Error ? e.message : e, '\nУже записанное остаётся, повторный запуск безопасен.'); process.exit(1) })
