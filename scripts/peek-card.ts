// Посмотреть карточки из большого файла парсера без тяжёлых полей.
//   npm run peek -- /путь/файл.json --nameless 3     первые 3 карточки, которые не прошли проверку «нет имени»
//   npm run peek -- /путь/файл.json --n 120          карточка с номером 120 (как в отчёте импорта)
import { cardsFrom } from '../src/lib/stream-json'
import { mapCard } from '../src/lib/yandex-card'

const HEAVY = new Set(['raw', 'portfolio', 'service_areas', 'videos', 'settings', 'display_options', 'source_urls'])
const brief = (v: unknown): unknown => (typeof v === 'string' ? v.slice(0, 80) : Array.isArray(v) ? `[список: ${v.length}]` : v && typeof v === 'object' ? `{поля: ${Object.keys(v).slice(0, 15).join(', ')}}` : v)

async function main() {
  const a = process.argv.slice(2), file = a[0]
  const want = a.includes('--nameless') ? Number(a[a.indexOf('--nameless') + 1]) || 3 : 0
  const nth = a.includes('--n') ? Number(a[a.indexOf('--n') + 1]) : 0
  let n = 0, shown = 0
  const keysNameless = new Map<string, number>()
  for await (const text of cardsFrom(file)) {
    n++
    if (nth && n !== nth) continue
    let raw: Record<string, unknown>
    try { raw = JSON.parse(text) } catch { continue }
    const m = mapCard(raw)
    const nameless = !m.ok && m.error === 'нет имени'
    if (nameless) for (const k of Object.keys(raw)) keysNameless.set(k, (keysNameless.get(k) ?? 0) + 1)
    if ((want && nameless && shown < want) || nth) {
      shown++
      console.log(`--- карточка №${n}${nameless ? ' (нет имени)' : ''}`)
      for (const [k, v] of Object.entries(raw)) if (!HEAVY.has(k)) console.log(`  ${k}: ${JSON.stringify(brief(v))}`)
      if (raw.raw && typeof raw.raw === 'object') console.log('поля внутри raw:', Object.keys(raw.raw as object).slice(0, 40).join(', '))
    }
    if (nth && shown) break
    if (!nth && shown >= want && n > 0 && want) { /* продолжаем считать поля до конца файла */ }
  }
  if (want) console.log(`\nВсего карточек без имени: ${[...keysNameless.values()][0] ?? 0}. Какие поля есть у таких карточек (поле: сколько):\n` + [...keysNameless].map(([k, v]) => `  ${k}: ${v}`).join('\n'))
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
