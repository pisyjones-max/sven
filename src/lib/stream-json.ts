import { createReadStream } from 'fs'

// Потоковый разбор: JSON-массив объектов или JSONL. Отдаёт каждую карточку отдельной строкой JSON.
export async function* cardsFrom(path: string): AsyncGenerator<string> {
  const stream = createReadStream(path, { encoding: 'utf8', highWaterMark: 1 << 20 })
  const jsonl = path.endsWith('.jsonl') || path.endsWith('.ndjson')
  let depth = 0, inStr = false, esc = false, buf = '', started = false, line = ''
  for await (const chunk of stream as AsyncIterable<string>) {
    if (jsonl) {
      line += chunk
      const parts = line.split('\n'); line = parts.pop() ?? ''
      for (const p of parts) if (p.trim()) yield p
      continue
    }
    let from = 0
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i]
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue }
      if (ch === '"') { inStr = true; continue }
      if (ch === '{' || ch === '[') {
        if (!started && ch === '[' && depth === 0) { started = true; from = i + 1; continue }
        if (depth === 0) { buf = ''; from = i }
        depth++
      } else if (ch === '}' || ch === ']') {
        depth--
        if (depth === 0) { yield buf + chunk.slice(from, i + 1); buf = '' }
      }
    }
    if (depth > 0) buf += chunk.slice(from)
  }
  if (jsonl && line.trim()) yield line
  if (!jsonl && !started) throw new Error('Ожидается JSON-массив карточек')
}

