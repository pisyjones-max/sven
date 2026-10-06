import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readdirSync, statSync } from 'fs'
import { kvGet, kvSet, kvScanKeys } from '@/lib/kv'
import { getConv, getPartner, listPartners, listRecentConvs, rememberTgMsg, saveConv } from '@/lib/store'
import { tgAdmin, tgSend } from '@/lib/tg'
import { SITE_URL } from '@/lib/site'
import { HOUR, LOST_AFTER, dailyStats, dayKey, lostRequests, mskHour, realConvs } from '@/lib/stats'

export const dynamic = 'force-dynamic'

// Вызывается по cron каждые 5 минут: GET /api/cron/tick?key=ADMIN_KEY
// 1) напоминание компании в Telegram, если заявка без ответа дольше часа
// 2) сообщение админу о заявках, на которые не ответил никто
// 3) утренняя сводка за вчера и проверка, что ночная копия базы на месте
async function run(req: NextRequest) {
  const key = process.env.ADMIN_KEY
  if (!key || req.nextUrl.searchParams.get('key') !== key) return NextResponse.json({ ok: false }, { status: 401 })
  const now = Date.now()
  const partners = await listPartners()
  const real = realConvs(await listRecentConvs(1500), partners)
  const byId = new Map(partners.map(p => [p.id, p]))
  let reminded = 0

  for (const c of real) {
    const age = now - c.createdAt
    if (c.accepted || c.complaint || c.remindedAt || age < LOST_AFTER || age > 48 * HOUR) continue
    const fresh = await getConv(c.id) // могли ответить между чтением списка и сейчас
    if (!fresh || fresh.accepted || fresh.remindedAt) continue
    const p = await getPartner(fresh.partnerId)
    if (!p || p.system) continue
    fresh.remindedAt = now
    await saveConv(fresh)
    const mins = Math.round(age / 60_000)
    if (p.tgChatId) {
      const id = await tgSend(p.tgChatId, `⏰ Заявка от ${fresh.clientName} ждёт ответа уже ${mins} мин.\n\n${fresh.msgs[0]?.text.slice(0, 300) ?? ''}\n\nОтветьте на это сообщение (кнопка «Ответить»), пока клиент не ушёл к другим.\nКабинет: ${SITE_URL}/cabinet/${p.token}`)
      if (id) await rememberTgMsg(p.tgChatId, id, fresh.id)
      reminded++
    }
  }

  // Заявки, на которые не ответил никто: один раз сообщаем админу, чтобы он позвонил клиенту
  const names = new Map(partners.map(p => [p.id, p.name]))
  for (const l of lostRequests(real, names, now).filter(x => now - x.at < 48 * HOUR)) {
    if (await kvGet(`lostalert:${l.key}`)) continue
    await kvSet(`lostalert:${l.key}`, now)
    await tgAdmin(`🔥 Заявка без ответа больше часа\n${l.clientName} +${l.clientPhone}\n${l.text.slice(0, 300)}\nКомпании: ${l.companies.join(', ')}`)
  }

  // Утренняя сводка и проверка копии
  const today = dayKey(now)
  if (mskHour(now) >= 9 && !(await kvGet(`digest:${today}`))) {
    await kvSet(`digest:${today}`, now)
    const orphanTimes = (await Promise.all((await kvScanKeys('orphan:*')).map(k => kvGet<{ at: number }>(k)))).filter((o): o is { at: number } => !!o).map(o => o.at)
    const y = dailyStats(real, orphanTimes, 2, now).find(d => d.day === dayKey(now - 24 * HOUR))
    if (y) await tgAdmin(`📊 Вчера: заявок ${y.requests}, с ответом ${y.requestsAnswered}, потеряно ${y.lost}, среднее время ответа ${y.avgMin ?? '—'} мин.\n${SITE_URL}/admin?key=${key}`)
    const dir = process.env.DATA_DIR ? `${process.env.DATA_DIR.replace(/\/$/, '')}/backups` : '/var/www/sven-data/backups'
    const last = existsSync(dir) ? Math.max(0, ...readdirSync(dir).filter(f => f.startsWith('kv-')).map(f => statSync(`${dir}/${f}`).mtimeMs)) : 0
    if (now - last > 36 * HOUR) await tgAdmin('⚠️ Ночная копия базы не найдена или устарела (старше 36 часов). Проверьте cron и deploy/backup.sh.')
  }
  return NextResponse.json({ ok: true, reminded, byId: byId.size })
}
export const GET = run
export const POST = run
