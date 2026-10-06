import type { NextRequest } from 'next/server'

// Простое ограничение частоты в памяти процесса (один сервер). Защита от спама поверх капчи.
const hits = new Map<string, number[]>()

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const arr = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  if (arr.length >= max) { hits.set(key, arr); return false }
  arr.push(now)
  hits.set(key, arr)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k)
  return true
}

export const clientIp = (req: NextRequest): string =>
  (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local'
