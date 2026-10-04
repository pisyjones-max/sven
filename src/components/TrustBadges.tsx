import { Partner, avgResponseMs } from '@/lib/store'
import { fmtResponse } from '@/lib/trust'

export function TrustBadges({ p, compact = false }: { p: Partner; compact?: boolean }) {
  const ms = avgResponseMs(p)
  const items: string[] = []
  if (p.verified) items.push('✓ Проверена платформой')
  if (p.phoneVerified) items.push('✓ Телефон подтверждён')
  if (ms !== null) items.push(`⚡ Отвечает в среднем за ${fmtResponse(ms)}`)
  if (!compact && p.since) items.push(`Работает с ${p.since} года`)
  if (!items.length) return null
  return <span className="trust-b">{items.map(t => <i key={t}>{t}</i>)}</span>
}
