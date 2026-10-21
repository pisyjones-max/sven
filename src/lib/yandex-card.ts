import { CATEGORIES, CITIES } from './catalog'

// Карточка исполнителя в формате парсера parser-uslug (yandex_all_companies.json, schema_version 5).
// Модуль чистый: без хранилища и сети, поэтому его же использует и браузер (проверка файла до отправки).

export interface ExtInfo {
  source: string // откуда данные, например yandex_uslugi
  id: string // стабильный ID исполнителя в источнике (ydo_worker_id → worker_id → id)
  profileUrl?: string
  accountType?: string // person | org | …: не все исполнители компании
  rating?: number // рейтинг В ИСТОЧНИКЕ, не путать с отзывами клиентов платформы
  reviews?: number
  completedReviews?: number
  finished?: number
  trusted?: boolean
  specs?: string[]
  srcCats?: { path: string; name: string }[]
  site?: string
  avatar?: string
  contacts?: Record<string, string> // публичные контакты из профиля: только для админа, на сайте не выводятся
  phoneId?: string
  portfolio?: { title: string; cover?: string }[]
  places?: string[] // районы работы (названия)
  seenAt?: string
}

export interface MappedCard {
  key: string // ключ дедупликации: psrc:<source>:<id>
  source: string
  id: string
  name: string
  city: string
  cats: string[]
  desc?: string
  ext: ExtInfo
  warnings: string[]
}

export type MapResult =
  | { ok: true; card: MappedCard }
  | { ok: false; kind: 'invalid' | 'skipped'; error: string; id?: string; name?: string }

// Категории Яндекса → категории платформы. Платформа знает мало категорий, поэтому сопоставление идёт по рубрике
// (первая часть пути). Всё, чего тут нет, не импортируется молча, а попадает в отчёт как «пропущено».
// Добавлять сюда строки по мере появления категорий в каталоге.
export const BUCKET = 'remont-i-stroitelstvo'
const RUBRIC_MAP: Record<string, string> = { 'remont-i-stroitelstvo': BUCKET }
// Точные категории (по пути без префикса рубрики), когда в каталоге есть своя: путь → slug
const PATH_RULES: [RegExp, string][] = []

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max = 400): string | undefined => {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s.slice(0, max) : undefined
}
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

export function sourceKey(raw: unknown): { source: string; id: string } | null {
  if (!isObj(raw)) return null
  const source = str(raw.source, 40)
  const id = str(raw.ydo_worker_id, 80) ?? str(raw.worker_id, 80) ?? str(raw.id, 80)
  return source && id ? { source: source.replace(/[^a-zA-Z0-9_-]/g, ''), id } : null
}

function mapCategory(path: string): string | null {
  const rubric = path.split('/')[0]
  for (const [re, slug] of PATH_RULES) if (re.test(path)) return slug
  return RUBRIC_MAP[rubric] ?? null
}

function mapContacts(links: unknown): Record<string, string> | undefined {
  const list = Array.isArray(links) ? links : isObj(links) ? Object.values(links) : []
  const out: Record<string, string> = {}
  for (const l of list) {
    if (!isObj(l)) continue
    for (const [k, v] of Object.entries(l)) { const s = str(v, 200); if (s && !out[k]) out[k] = s }
  }
  return Object.keys(out).length ? out : undefined
}

export function mapCard(raw: unknown): MapResult {
  if (!isObj(raw)) return { ok: false, kind: 'invalid', error: 'запись не объект' }
  const k = sourceKey(raw)
  const first = str(raw.first_name, 60), last = str(raw.last_name, 60)
  const name = (str(raw.name, 120) ?? [first, last].filter(Boolean).join(' ')) || undefined
  if (!k) return { ok: false, kind: 'invalid', error: 'нет source или идентификатора (ydo_worker_id / worker_id / id)', name }
  if (!name) return { ok: false, kind: 'invalid', error: 'нет имени', id: k.id }
  const warnings: string[] = []

  // категории: categories[] или запасной found_in[]
  let srcCats: { path: string; name: string }[] = []
  if (Array.isArray(raw.categories)) srcCats = raw.categories.filter(isObj).map(c => ({ path: str(c.path, 200) ?? '', name: str(c.name, 120) ?? '' })).filter(c => c.path)
  if (!srcCats.length && Array.isArray(raw.found_in)) srcCats = raw.found_in.filter(isObj).map(c => ({ path: str(c.category_path, 200) ?? '', name: str(c.category_name, 120) ?? '' })).filter(c => c.path)
  if (!srcCats.length) return { ok: false, kind: 'invalid', error: 'нет категорий (categories / found_in)', id: k.id, name }
  const cats = [...new Set(srcCats.map(c => mapCategory(c.path)).filter((s): s is string => !!s && CATEGORIES.some(c => c.slug === s)))]
  if (!cats.length) return { ok: false, kind: 'skipped', error: `категория вне каталога платформы: ${srcCats.map(c => c.name || c.path).join(', ').slice(0, 120)}`, id: k.id, name }

  // город: cities[] или found_in[].city, первый известный платформе
  const cityNames = [
    ...(Array.isArray(raw.cities) ? raw.cities : []),
    ...(Array.isArray(raw.found_in) ? raw.found_in.filter(isObj).map(f => f.city) : []),
  ].map(c => str(c, 80)).filter((c): c is string => !!c)
  const hit = cityNames.map(n => CITIES.find(c => c.name.toLowerCase() === n.toLowerCase())).find(Boolean)
  if (!hit) warnings.push(`город «${cityNames[0] ?? '—'}» не из списка платформы, поставлена Московская область`)
  const city = hit?.slug ?? 'podmoskove'

  const rating = num(raw.rating), reviews = num(raw.reviews_count)
  for (const f of ['rating', 'reviews_count', 'finished_orders'] as const) if (raw[f] != null && num(raw[f]) === undefined) warnings.push(`поле ${f} не число, пропущено`)

  const specs = Array.isArray(raw.specializations) ? [...new Set(raw.specializations.map(s => str(s, 100)).filter((s): s is string => !!s))].slice(0, 80) : undefined
  const portfolio = Array.isArray(raw.portfolio)
    ? raw.portfolio.flatMap(p => (isObj(p) ? Object.values(p) : [])).filter(isObj)
        .map(p => ({ title: str(p.title, 120) ?? '', cover: str(p.coverUrl, 300) })).filter(p => p.title).slice(0, 6)
    : undefined
  const places = Array.isArray(raw.service_areas) ? [...new Set(raw.service_areas.filter(isObj).map(a => str(a.name, 80)).filter((s): s is string => !!s))].slice(0, 30) : undefined
  const site = str(raw.site, 200)

  const ext: ExtInfo = {
    source: k.source, id: k.id,
    profileUrl: str(raw.profile_url, 300),
    accountType: str(raw.account_type, 20),
    rating: rating && rating > 0 ? rating : undefined,
    reviews: reviews && reviews > 0 ? reviews : undefined,
    completedReviews: num(raw.completed_reviews_count) || undefined,
    finished: num(raw.finished_orders) || undefined,
    trusted: raw.is_trusted === true ? true : undefined,
    specs: specs?.length ? specs : undefined,
    srcCats,
    site: site && /^https?:\/\//i.test(site) ? site : undefined,
    avatar: str(raw.avatar, 300),
    contacts: mapContacts(raw.social_links),
    phoneId: str(raw.phone_id, 40),
    portfolio: portfolio?.length ? portfolio : undefined,
    places: places?.length ? places : undefined,
    seenAt: str(raw.last_seen_at, 40),
  }
  return { ok: true, card: { key: `psrc:${k.source}:${k.id}`, source: k.source, id: k.id, name, city, cats, desc: str(raw.description, 600), ext, warnings } }
}

const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || (isObj(v) && !Object.keys(v).length)

// Слияние при повторном импорте: пустые значения нового файла не затирают старые данные
export function mergeExt(old: ExtInfo | undefined, next: ExtInfo): ExtInfo {
  const out: Record<string, unknown> = { ...(old ?? {}) }
  for (const [k, v] of Object.entries(next)) if (!empty(v)) out[k] = v
  return out as unknown as ExtInfo
}
