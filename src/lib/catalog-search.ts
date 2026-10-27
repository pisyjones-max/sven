import type { Partner } from './store'

// Поиск по названию, описанию, специализациям и рубрикам исполнителя. Все слова запроса должны встретиться (И), регистр и «ё» не важны.
export const PAGE_SIZE = 24

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е')
const hay = (p: Partner) => norm([p.name, p.desc, ...(p.ext?.specs ?? []), ...(p.ext?.srcCats?.map(c => c.name) ?? [])].filter(Boolean).join(' '))

export function searchPartners(list: Partner[], q: string): Partner[] {
  const words = norm(q).split(/[^a-zа-я0-9]+/).filter(w => w.length > 1)
  if (!words.length) return list
  return list.filter(p => { const h = hay(p); return words.every(w => h.includes(w)) })
}

export function paginate<T>(list: T[], page: number, size = PAGE_SIZE): { items: T[]; page: number; pages: number; total: number } {
  const pages = Math.max(1, Math.ceil(list.length / size))
  const pg = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  return { items: list.slice((pg - 1) * size, pg * size), page: pg, pages, total: list.length }
}

export const cleanQ = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? '').slice(0, 80).trim()
export const cleanPage = (v: string | string[] | undefined) => Number(Array.isArray(v) ? v[0] : v) || 1
