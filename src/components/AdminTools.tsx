'use client'
import { useState } from 'react'

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
