import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname } from 'path'

// Хранилище по приоритету: Postgres (DATABASE_URL) → Upstash Redis REST → файл на диске (DATA_DIR) → память процесса.
const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? ''
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? ''

const PG_URL = process.env.DATABASE_URL ?? ''
const DATA_FILE = process.env.DATA_DIR ? `${process.env.DATA_DIR.replace(/\/$/, '')}/kv.json` : ''

function loadMem(): Map<string, string> {
  const m = new Map<string, string>()
  if (DATA_FILE && existsSync(DATA_FILE)) {
    try {
      for (const [k, v] of Object.entries(JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Record<string, string>)) m.set(k, String(v))
    } catch (e) {
      console.error('[doma] kv load failed', e)
    }
  }
  return m
}

let deferPersist = false // массовый импорт: пишем файл раз в пачку, а не после каждой записи
export function kvDeferPersist(on: boolean) { deferPersist = on }
export function kvFlush() { const d = deferPersist; deferPersist = false; persist(mem); deferPersist = d }
export const kvIsFileBackend = () => !PG_URL && !isKvConfigured() && !!DATA_FILE
export const kvIsPostgres = () => !!PG_URL

function persist(m: Map<string, string>) {
  if (!DATA_FILE || deferPersist) return
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true })
    const tmp = `${DATA_FILE}.tmp`
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(m)))
    renameSync(tmp, DATA_FILE) // атомарно: при сбое файл не портится
  } catch (e) {
    console.error('[doma] kv persist failed', e)
  }
}

type MemGlobal = typeof globalThis & { __kvmem?: Map<string, string> }
const g = globalThis as MemGlobal
const mem: Map<string, string> = g.__kvmem ?? (g.__kvmem = loadMem())

export function isKvConfigured(): boolean {
  return Boolean(KV_URL && KV_TOKEN)
}

async function kvFetch(path: string): Promise<{ result?: unknown }> {
  const res = await fetch(`${KV_URL}${path}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`KV request failed: ${res.status}`)
  return res.json()
}

// --- Postgres: одна таблица kv (ключ → jsonb). Без полной перезаписи файла на каждую запись, с настоящим поиском по ключам.
type PgPool = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>; end: () => Promise<void> }
const gp = globalThis as typeof globalThis & { __kvpg?: Promise<PgPool> }
export function pgPool(): Promise<PgPool> {
  return (gp.__kvpg ??= (async () => {
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: PG_URL, max: 5, connectionTimeoutMillis: 8000 }) as unknown as PgPool
    await pool.query('CREATE TABLE IF NOT EXISTS kv (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())')
    await pool.query('CREATE INDEX IF NOT EXISTS kv_key_prefix ON kv (key text_pattern_ops)')
    return pool
  })())
}
const likeOf = (pattern: string) => pattern.replace(/[\\%_]/g, '\\$&').replace(/\*/g, '%')

export async function kvSet(key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value)
  if (PG_URL) {
    await (await pgPool()).query('INSERT INTO kv (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()', [key, json])
    return
  }
  if (!isKvConfigured()) { mem.set(key, json); persist(mem); return }
  // Тело через POST: ссылки длиннее лимита URL ломали бы запись переписки
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    body: json,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`KV set failed: ${res.status}`)
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (PG_URL) {
    const r = await (await pgPool()).query('SELECT value FROM kv WHERE key = $1', [key])
    return r.rows.length ? (r.rows[0].value as T) : null
  }
  let raw: unknown
  if (!isKvConfigured()) raw = mem.get(key) ?? null
  else raw = (await kvFetch(`/get/${encodeURIComponent(key)}`)).result ?? null
  if (raw == null) return null
  try {
    return JSON.parse(String(raw)) as T
  } catch {
    return null
  }
}

export async function kvScanKeys(pattern: string): Promise<string[]> {
  if (PG_URL) return (await (await pgPool()).query("SELECT key FROM kv WHERE key LIKE $1 ESCAPE '\\'", [likeOf(pattern)])).rows.map(r => String(r.key))
  if (!isKvConfigured()) {
    const re = new RegExp('^' + pattern.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$')
    return [...mem.keys()].filter(k => re.test(k))
  }
  const keys: string[] = []
  let cursor = '0'
  do {
    const data = await kvFetch(`/scan/${cursor}/match/${encodeURIComponent(pattern)}/count/200`)
    const [next, batch] = (data.result as [string, string[]]) ?? ['0', []]
    cursor = next
    if (Array.isArray(batch)) keys.push(...batch)
  } while (cursor !== '0')
  return keys
}
