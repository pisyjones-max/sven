import { kvGet, kvSet } from './kv'
import { savePartner, getPartner, slugify, rid, type Partner } from './store'
import { mapCard, mergeExt, type MappedCard } from './yandex-card'

export type RowStatus = 'created' | 'updated' | 'unchanged' | 'skipped' | 'invalid'
export interface ImportRow { n: number; id?: string; name?: string; status: RowStatus; note?: string; slug?: string }
export interface ImportReport { applied: boolean; counts: Record<RowStatus, number>; rows: ImportRow[] }

export const MAX_CARDS_PER_REQUEST = 300

const SOURCE_NAMES: Record<string, string> = { yandex_uslugi: 'Яндекс Услугах' }

// Что именно из карточки платформа считает «данными исполнителя» (для определения «без изменений»)
const snapshot = (p: Partner) => JSON.stringify({ n: p.name, d: p.desc, c: [...p.cats].sort(), s: p.source, e: { ...p.ext, seenAt: undefined } })

async function upsert(c: MappedCard, apply: boolean, seen: Set<string>): Promise<{ status: RowStatus; note?: string; slug?: string }> {
  const notes = [...c.warnings]
  const existingId = await kvGet<string>(c.key)
  const prev = existingId ? await getPartner(existingId) : null
  const source = c.ext.profileUrl ? { name: SOURCE_NAMES[c.source] ?? c.source, url: c.ext.profileUrl } : undefined

  if (!prev) {
    // дубль внутри одного файла/пакета при предпросмотре: второй раз та же карточка станет обновлением
    if (seen.has(c.key)) return { status: 'updated', note: 'повтор в файле: данные объединятся' }
    seen.add(c.key)
    const nameDup = await kvGet<string>(`pname:${slugify(c.name)}:${c.city}`)
    if (nameDup) notes.push('в этом районе уже есть компания с таким названием: проверьте, не дубль ли')
    const slug = `${slugify(c.name) || 'company'}-${rid(2)}`
    if (apply) {
      const id = rid(6)
      const p: Partner = {
        id, slug, token: rid(16), name: c.name, phone: '', cats: c.cats, city: c.city, leads: 0, createdAt: Date.now(),
        desc: c.desc, imported: true, claimed: false, source, src: c.source, ext: c.ext,
      }
      await savePartner(p)
      await kvSet(`pslug:${p.slug}`, id)
      await kvSet(`ptok:${p.token}`, id)
      await kvSet(c.key, id) // ключ ставим последним: если запись оборвалась, повторный импорт создаст её заново
    }
    return { status: 'created', note: notes.join('; ') || undefined, slug }
  }

  // повторный импорт: обновляем только то, что пришло непустым; чужие правки и заявки не трогаем
  seen.add(c.key)
  const before = snapshot(prev)
  const next: Partner = {
    ...prev,
    name: c.name || prev.name,
    desc: c.desc ?? prev.desc,
    cats: [...new Set([...prev.cats, ...c.cats])],
    source: source ?? prev.source,
    ext: mergeExt(prev.ext, c.ext),
  }
  if (snapshot(next) === before) return { status: 'unchanged', slug: prev.slug }
  if (apply) await savePartner(next)
  return { status: 'updated', note: notes.join('; ') || undefined, slug: prev.slug }
}

// Импорт пачки карточек в исходном формате парсера. apply=false: только проверка и предпросмотр, ничего не пишется.
export async function importParserCards(cards: unknown[], apply: boolean, seen: Set<string> = new Set()): Promise<ImportReport> {
  const counts: Record<RowStatus, number> = { created: 0, updated: 0, unchanged: 0, skipped: 0, invalid: 0 }
  const rows: ImportRow[] = []
  for (let n = 0; n < cards.length; n++) {
    const m = mapCard(cards[n])
    let row: ImportRow
    if (!m.ok) row = { n, id: m.id, name: m.name, status: m.kind, note: m.error }
    else {
      try {
        const r = await upsert(m.card, apply, seen)
        row = { n, id: m.card.id, name: m.card.name, ...r }
      } catch (e) {
        row = { n, id: m.card.id, name: m.card.name, status: 'invalid', note: `ошибка записи: ${e instanceof Error ? e.message : 'неизвестно'}` }
      }
    }
    counts[row.status]++
    rows.push(row)
  }
  return { applied: apply, counts, rows }
}
