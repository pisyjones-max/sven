import { CATEGORIES, CITIES } from './catalog'

// Разбор CSV из Excel и Google Таблиц: разделитель ; , или табуляция, кавычки, BOM
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const first = t.split('\n', 1)[0] ?? ''
  const delim = [';', '\t', ','].map(d => ({ d, n: first.split(d).length })).sort((a, b) => b.n - a.n)[0].d
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += ch
    } else if (ch === '"') q = true
    else if (ch === delim) { row.push(cell.trim()); cell = '' }
    else if (ch === '\n') { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

const HEAD: Record<string, RegExp> = {
  name: /^(name|название|имя|компания|мастер|фио)/i,
  phone: /^(phone|тел|номер)/i,
  cats: /^(cats?|категори|ниш|услуг|вид)/i,
  city: /^(city|район|город|округ)/i,
  desc: /^(desc|описан|о себе|комментар)/i,
  price: /^(price|цена|стоимость|прайс)/i,
}
export type Col = keyof typeof HEAD

const CAT_RE: [string, RegExp][] = [
  ['otkachka-septika', /септик|выгреб|ассениз|откач|otkachka/i],
  ['vyvoz-musora', /мусор|вывоз|vyvoz/i],
  ['pokos-travy', /покос|трав[аыу]|коси|триммер|pokos/i],
  ['uborka-snega', /снег|снеж|uborka-snega/i],
  ['pomosch-sosedu', /по.?соседски|помощь по соседству|поручени|pomosch/i],
  ['uborka-uchastka', /расчист|участк|uborka-uchastka/i],
  ['spil-derevev', /спил|удален\w+ дерев|spil/i],
  ['zabor', /забор|zabor/i],
  ['krovlya', /кровл|крыш|krovlya/i],
  ['garazh', /гараж|навес|garazh/i],
  ['parkovka-plitka', /плитк|парковк|parkovka/i],
]
export const parseCats = (cell: string): string[] => CAT_RE.filter(([slug, re]) => re.test(cell) || cell.split(/[\s,;/|+]+/).includes(slug)).map(([s]) => s)

export function parseCity(cell: string): { slug: string; guessed: boolean } {
  const v = cell.trim().toLowerCase()
  if (!v) return { slug: 'ramenskoe', guessed: false }
  const c = CITIES.find(x => x.slug === v || x.name.toLowerCase() === v || (v.length >= 5 && x.name.toLowerCase().startsWith(v.slice(0, 5))))
  return c ? { slug: c.slug, guessed: false } : { slug: 'ramenskoe', guessed: true } // гжель, посёлки и т.п. пока в районе запуска
}

// Заголовок: сопоставляем колонки по названию; без заголовка порядок: название, телефон, категории, район
export function mapColumns(rows: string[][]): { cols: Record<Col, number>; body: string[][]; startLine: number } {
  const cols = { name: -1, phone: -1, cats: -1, city: -1, desc: -1, price: -1 } as Record<Col, number>
  const head = rows[0] ?? []
  let found = 0
  head.forEach((h, i) => { for (const k of Object.keys(HEAD) as Col[]) if (cols[k] < 0 && HEAD[k].test(h.trim())) { cols[k] = i; found++; break } })
  if (found >= 2) return { cols, body: rows.slice(1), startLine: 2 }
  return { cols: { name: 0, phone: 1, cats: 2, city: 3, desc: -1, price: -1 }, body: rows, startLine: 1 }
}
export const validSlugs = () => ({ cats: new Set(CATEGORIES.map(c => c.slug)), cities: new Set(CITIES.map(c => c.slug)) })
