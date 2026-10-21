'use client'
import { useState } from 'react'
import { sourceKey } from '@/lib/yandex-card'

interface Row { line: number; name: string; phone: string; status: string; note?: string; cats?: string; cabinet?: string; tg?: string }
interface Res { ok: boolean; applied?: boolean; created: number; duplicate: number; invalid: number; rows: Row[]; error?: string }

export function CsvImport({ adminKey }: { adminKey: string }) {
  const [csv, setCsv] = useState('')
  const [live, setLive] = useState(true)
  const [src, setSrc] = useState('csv')
  const [res, setRes] = useState<Res | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(apply: boolean) {
    if (apply && !window.confirm('Создать компании из таблицы?')) return
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/import-csv?key=${encodeURIComponent(adminKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, apply, live, src }) })
      setRes(await r.json())
    } catch { setRes({ ok: false, created: 0, duplicate: 0, invalid: 0, rows: [], error: 'Нет связи' }) }
    setBusy(false)
  }
  async function file(f?: File) { if (f) setCsv(await f.text()) }
  const links = res?.applied ? res.rows.filter(r => r.cabinet).map(r => `${r.name} ${r.phone}\nКабинет: ${r.cabinet}${r.tg ? `\nTelegram: ${r.tg}` : ''}`).join('\n\n') : ''

  return (
    <div className="card">
      <h3>Загрузка мастеров из таблицы</h3>
      <p className="small muted">Колонки: название, телефон, категории (септик, мусор, покос, снег), район. Можно вставить из Excel или Google Таблиц, либо выбрать CSV-файл. Дубли по телефону и по названию с районом пропускаются.</p>
      <input type="file" accept=".csv,.txt,.tsv" onChange={e => file(e.target.files?.[0])} />
      <textarea rows={6} placeholder={'Название;Телефон;Категории;Район\nИП Иванов;+7 916 123-45-67;септик, мусор;Раменское'} value={csv} onChange={e => setCsv(e.target.value)} />
      <label className="check"><input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} /><span>Мастера согласились: заявки идут им сразу (иначе страница ждёт, пока владелец её заберёт)</span></label>
      <label className="small">Источник (для статистики): <input value={src} onChange={e => setSrc(e.target.value)} maxLength={30} style={{ width: 140 }} /></label>
      <div className="row">
        <button className="btn ghost sm" disabled={busy || !csv.trim()} onClick={() => run(false)}>Проверить</button>
        <button className="btn sm" disabled={busy || !csv.trim()} onClick={() => run(true)}>Загрузить</button>
      </div>
      {res && !res.ok && <p className="err">Ошибка: {res.error ?? 'не удалось'}</p>}
      {res?.ok && (
        <>
          <p><b>{res.applied ? 'Загружено' : 'Проверка'}:</b> новых {res.created}, дублей {res.duplicate}, с ошибками {res.invalid}</p>
          {res.rows.map(r => <p key={r.line} className="small">строка {r.line}: <b>{r.name || '—'}</b> {r.phone} · {r.status}{r.cats ? ` · ${r.cats}` : ''}{r.note ? ` · ${r.note}` : ''}</p>)}
          {links && <><p className="small"><b>Ссылки на кабинеты</b> (отправьте мастерам, это их вход):</p><textarea readOnly rows={8} value={links} onFocus={e => e.currentTarget.select()} /></>}
        </>
      )}
    </div>
  )
}

type PStatus = 'created' | 'updated' | 'unchanged' | 'skipped' | 'invalid'
interface PRow { n: number; id?: string; name?: string; status: PStatus; note?: string }
const P_LABEL: Record<PStatus, string> = { created: 'новая', updated: 'обновление', unchanged: 'без изменений', skipped: 'пропущено', invalid: 'ошибка' }
const CHUNK = 100

// Импорт JSON в исходном формате парсера: файл → проверка и предпросмотр → подтверждение → итоговый отчёт.
// Файл режется на пачки в браузере, поэтому тот же путь подходит и для тысяч карточек.
export function ParserImport({ adminKey }: { adminKey: string }) {
  const [cards, setCards] = useState<unknown[] | null>(null)
  const [fname, setFname] = useState('')
  const [counts, setCounts] = useState<Record<PStatus, number> | null>(null)
  const [rows, setRows] = useState<PRow[]>([])
  const [applied, setApplied] = useState(false)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  async function pick(f?: File) {
    setCards(null); setCounts(null); setRows([]); setApplied(false); setErr('')
    if (!f) return
    setFname(f.name)
    let data: unknown
    try { data = JSON.parse(await f.text()) } catch (e) { setErr(`Файл не читается как JSON: ${e instanceof Error ? e.message : ''}`); return }
    if (!Array.isArray(data)) { setErr('Ожидается JSON-массив карточек, как в файле парсера'); return }
    setCards(data)
  }

  async function run(apply: boolean) {
    if (!cards) return
    if (apply && !window.confirm(`Загрузить ${cards.length} карточек? Новые будут созданы, существующие обновлены.`)) return
    setErr(''); setApplied(false)
    const total: Record<PStatus, number> = { created: 0, updated: 0, unchanged: 0, skipped: 0, invalid: 0 }
    const all: PRow[] = []
    const seen = new Set<string>()
    try {
      for (let i = 0; i < cards.length; i += CHUNK) {
        setBusy(`${Math.min(i + CHUNK, cards.length)} из ${cards.length}`)
        // дубли внутри файла отсекаем здесь: первая карточка идёт в работу, повторы показываются в отчёте
        const part: unknown[] = [], idx: number[] = []
        cards.slice(i, i + CHUNK).forEach((c, j) => {
          const k = sourceKey(c); const key = k ? `${k.source}:${k.id}` : ''
          if (key && seen.has(key)) { total.skipped++; all.push({ n: i + j + 1, id: k?.id, status: 'skipped', note: 'повтор в файле: учтена первая карточка' }); return }
          if (key) seen.add(key)
          part.push(c); idx.push(i + j + 1)
        })
        if (!part.length) continue
        const r = await fetch(`/api/admin/import-parser?key=${encodeURIComponent(adminKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cards: part, apply }) })
        const j = await r.json().catch(() => null)
        if (!j?.ok) throw new Error(j?.error ?? `сервер ответил ${r.status}`)
        for (const k of Object.keys(total) as PStatus[]) total[k] += j.counts[k]
        for (const row of j.rows as PRow[]) all.push({ ...row, n: idx[row.n] })
      }
      setCounts(total); setRows(all); setApplied(apply)
    } catch (e) { setErr(`Остановлено: ${e instanceof Error ? e.message : 'нет связи'}. Уже записанное останется, повторный запуск безопасен.`); setCounts(total); setRows(all) }
    setBusy('')
  }

  const shown = rows.filter(r => r.status !== 'unchanged' || rows.length <= 50).slice(0, 200)
  return (
    <div className="card">
      <h3>Импорт исполнителей из JSON парсера</h3>
      <p className="small muted">Берётся файл парсера как есть, без конвертации. Повторная загрузка того же файла дублей не создаёт: исполнитель определяется по идентификатору источника, существующие карточки обновляются, пустые значения старые данные не стирают.</p>
      <input type="file" accept=".json,application/json" onChange={e => pick(e.target.files?.[0])} />
      {cards && <p className="small">Файл {fname}: карточек {cards.length}</p>}
      <div className="row">
        <button className="btn ghost sm" disabled={!cards || !!busy} onClick={() => run(false)}>Проверить</button>
        <button className="btn sm" disabled={!cards || !!busy || !counts || applied} onClick={() => run(true)}>Подтвердить и загрузить</button>
      </div>
      {busy && <p className="small">Обработано {busy}…</p>}
      {err && <p className="err">{err}</p>}
      {counts && (
        <>
          <p><b>{applied ? 'Загружено' : 'Предпросмотр (ничего не записано)'}:</b> новых {counts.created}, обновлений {counts.updated}, без изменений {counts.unchanged}, пропущено {counts.skipped}, ошибок {counts.invalid}</p>
          {shown.map(r => <p key={r.n} className="small">№{r.n}: <b>{r.name || r.id || '—'}</b> · {P_LABEL[r.status]}{r.note ? ` · ${r.note}` : ''}</p>)}
          {rows.length > shown.length && <p className="small muted">Показаны не все строки ({shown.length} из {rows.length}); «без изменений» скрыты.</p>}
        </>
      )}
    </div>
  )
}

export function BalanceTool({ adminKey, partners }: { adminKey: string; partners: { slug: string; name: string; balance: number }[] }) {
  const [slug, setSlug] = useState(partners[0]?.slug ?? '')
  const [amount, setAmount] = useState('500')
  const [msg, setMsg] = useState('')
  async function go() {
    setMsg('')
    const r = await fetch(`/api/admin/balance?key=${encodeURIComponent(adminKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, amount: Number(amount) }) }).then(x => x.json()).catch(() => null)
    setMsg(r?.ok ? `Готово, баланс ${r.balance} ₽ (обновите страницу)` : 'Не удалось')
  }
  return (
    <div className="card">
      <h3>Баланс компании</h3>
      <select value={slug} onChange={e => setSlug(e.target.value)}>{partners.map(p => <option key={p.slug} value={p.slug}>{p.name} · {p.balance} ₽</option>)}</select>
      <div className="row"><input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Сумма, ₽ (минус для списания)" /><button className="btn sm" onClick={go} disabled={!slug}>Применить</button></div>
      <p className="small muted">Сумма в рублях; со знаком минус баланс уменьшается.</p>
      {msg && <p className="small">{msg}</p>}
    </div>
  )
}
