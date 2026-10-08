import { randomBytes } from 'crypto'
import { kvGet, kvSet } from './kv'
import { Conv } from './store'

// «Мои люди»: личные отметки кабинета о компаниях и людях, и рекомендации. Публичной оценки-цифры здесь нет.
export const HELPER_CAT = 'pomosch-sosedu'
// Сосед-помощник: человек, который помогает по-соседски, а не компания
export const isHelper = (p: { cats: string[] }) => p.cats.length === 1 && p.cats[0] === HELPER_CAT

export type Mark = 'again' | 'pricey' | 'family' | 'avoid'
export const MARKS: Mark[] = ['again', 'pricey', 'family', 'avoid']
export interface PersonNote { mark?: Mark; note?: string }

export async function getNotes(acctId: string): Promise<Record<string, PersonNote>> {
  return (await kvGet<Record<string, PersonNote>>(`people:${acctId}`)) ?? {}
}
export async function setNote(acctId: string, partnerId: string, patch: { mark?: string | null; note?: string }) {
  const all = await getNotes(acctId)
  const cur = all[partnerId] ?? {}
  if (patch.mark !== undefined) cur.mark = MARKS.includes(patch.mark as Mark) ? (patch.mark as Mark) : undefined
  if (patch.note !== undefined) cur.note = patch.note.trim().slice(0, 300) || undefined
  all[partnerId] = cur
  await kvSet(`people:${acctId}`, all)
}

// Рекомендация: передача доверия. Получатель видит имя и комментарий, но не заказы и переписки рекомендателя.
export interface Rec { code: string; partnerId: string; acctId: string; name: string; comment: string; at: number; uses: number }

export const firstName = (convs: Conv[], partnerId: string): string => {
  const c = convs.filter(x => x.partnerId === partnerId).sort((a, b) => b.createdAt - a.createdAt)[0] ?? convs[0]
  return (c?.clientName ?? '').trim().split(/\s+/)[0].slice(0, 30) || 'Знакомый'
}

export async function createRec(acctId: string, name: string, partnerId: string, comment: string): Promise<Rec> {
  const idxKey = `arec:${acctId}:${partnerId}`
  const existing = await kvGet<string>(idxKey)
  const old = existing ? await kvGet<Rec>(`rec:${existing}`) : null
  if (old) {
    const upd = { ...old, name, comment: comment.slice(0, 300) }
    await kvSet(`rec:${old.code}`, upd)
    return upd
  }
  const rec: Rec = { code: randomBytes(5).toString('hex'), partnerId, acctId, name, comment: comment.slice(0, 300), at: Date.now(), uses: 0 }
  await kvSet(`rec:${rec.code}`, rec)
  await kvSet(idxKey, rec.code)
  const list = (await kvGet<string[]>(`precs:${partnerId}`)) ?? []
  await kvSet(`precs:${partnerId}`, [rec.code, ...list].slice(0, 500))
  return rec
}
export const getRec = (code: string) => kvGet<Rec>(`rec:${code}`)
export async function recsFor(partnerId: string): Promise<Rec[]> {
  const codes = (await kvGet<string[]>(`precs:${partnerId}`)) ?? []
  return (await Promise.all(codes.map(getRec))).filter((r): r is Rec => !!r)
}
export async function countRecUse(rec: Rec) { await kvSet(`rec:${rec.code}`, { ...rec, uses: rec.uses + 1 }) }
