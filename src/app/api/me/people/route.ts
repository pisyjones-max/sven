import { NextRequest, NextResponse } from 'next/server'
import { accountConvs, currentSession } from '@/lib/account'
import { getPartner } from '@/lib/store'
import { getCategory } from '@/lib/catalog'
import { getNotes, setNote } from '@/lib/people'

export const dynamic = 'force-dynamic'

// «Мои люди»: все, кто хоть раз ответил кабинету. Приватные заказы близким не показываются.
async function visibleConvs(acctId: string, role: string) {
  return (await accountConvs(acctId)).filter(c => !(role === 'guest' && c.private))
}

export async function GET() {
  const s = await currentSession()
  if (!s) return NextResponse.json({ ok: true, people: [] })
  const convs = (await visibleConvs(s.acctId, s.role)).filter(c => c.accepted)
  const notes = await getNotes(s.acctId)
  const by = new Map<string, typeof convs>()
  for (const c of convs) by.set(c.partnerId, [...(by.get(c.partnerId) ?? []), c])
  const people = []
  for (const [pid, list] of by) {
    const p = await getPartner(pid)
    if (!p || p.system) continue
    const last = list.sort((a, b) => b.createdAt - a.createdAt)[0]
    people.push({
      partnerId: pid, slug: p.slug, name: p.name, times: list.length, lastAt: last.createdAt,
      cat: getCategory(last.cat ?? p.cats[0])?.title ?? '', catSlug: last.cat ?? p.cats[0],
      mark: notes[pid]?.mark ?? null, note: notes[pid]?.note ?? '',
    })
  }
  return NextResponse.json({ ok: true, people: people.sort((a, b) => b.lastAt - a.lastAt) })
}

export async function POST(req: NextRequest) {
  const s = await currentSession()
  if (!s) return NextResponse.json({ ok: false }, { status: 401 })
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const pid = String(b.partnerId ?? '')
  if (!(await visibleConvs(s.acctId, s.role)).some(c => c.partnerId === pid && c.accepted)) return NextResponse.json({ ok: false, error: 'no_access' }, { status: 403 })
  await setNote(s.acctId, pid, { mark: b.mark === undefined ? undefined : (b.mark as string | null), note: typeof b.note === 'string' ? b.note : undefined })
  return NextResponse.json({ ok: true })
}
