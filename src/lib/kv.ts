import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname } from 'path'

// Хранилище по приоритету: Upstash Redis REST → файл на диске (DATA_DIR, для своего сервера) → память процесса.
const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? ''
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? ''

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

function persist(m: Map<string, string>) {
  if (!DATA_FILE) return
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

export async function kvSet(key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value)
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
