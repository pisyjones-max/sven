// Перенос данных из файла kv.json (DATA_DIR) в Postgres (DATABASE_URL).
//   npm run migrate:pg            проверка: что будет перенесено, ничего не пишется
//   npm run migrate:pg -- --apply перенос
// Безопасно повторять: уже лежащие в Postgres ключи НЕ перезаписываются, исходный файл не меняется и не удаляется.
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
  const apply = process.argv.includes('--apply')
  const dir = process.env.DATA_DIR?.replace(/\/$/, '')
  if (!process.env.DATABASE_URL) { console.error('Нет DATABASE_URL (строка подключения к Postgres).'); process.exit(2) }
  const file = dir ? `${dir}/kv.json` : ''
  if (!file || !existsSync(file)) { console.error(`Не найден файл данных: ${file || 'DATA_DIR не задан'}`); process.exit(2) }
  const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>
  const entries = Object.entries(data)
  const { pgPool } = await import('../src/lib/kv')
  const pool = await pgPool()
  const prefixes = new Map<string, number>()
  let bad = 0
  const rows: [string, string][] = []
  for (const [k, v] of entries) {
    try { JSON.parse(String(v)); rows.push([k, String(v)]); const p = k.split(':')[0]; prefixes.set(p, (prefixes.get(p) ?? 0) + 1) } catch { bad++ }
  }
  console.log(`В файле ключей: ${entries.length}, не читаются как JSON: ${bad}`)
  console.log('По типам:', [...prefixes].sort((a, z) => z[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(', '))
  if (!apply) { console.log('\nПРОВЕРКА: ничего не записано. Для переноса добавь --apply'); await pool.end(); return }
  let inserted = 0
  for (let i = 0; i < rows.length; i += 500) {
    const part = rows.slice(i, i + 500)
    const r = await pool.query(
      'INSERT INTO kv (key, value) SELECT k, v::jsonb FROM unnest($1::text[], $2::text[]) AS t(k, v) ON CONFLICT (key) DO NOTHING RETURNING key',
      [part.map(x => x[0]), part.map(x => x[1])])
    inserted += r.rows.length
  }
  const total = Number((await pool.query('SELECT count(*) AS n FROM kv')).rows[0].n)
  console.log(`\nПЕРЕНЕСЕНО: новых ${inserted}, уже были ${rows.length - inserted}, всего в базе ${total}. Исходный файл не тронут.`)
  await pool.end()
}
main().catch(e => { console.error('Остановлено:', e instanceof Error ? e.message : e); process.exit(1) })
