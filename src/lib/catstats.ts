import { Partner, avgRating, isLive } from './store'

export function catStats(partners: Partner[]): Record<string, { count: number; rating: number | null }> {
  const out: Record<string, { count: number; rating: number | null }> = {}
  const acc: Record<string, number[]> = {}
  for (const p of partners) {
    if (!isLive(p)) continue
    for (const c of p.cats) {
      out[c] ??= { count: 0, rating: null }
      out[c].count += 1
      const r = avgRating(p)
      if (r !== null) (acc[c] ??= []).push(r)
    }
  }
  for (const [c, rs] of Object.entries(acc)) out[c].rating = rs.reduce((a, b) => a + b, 0) / rs.length
  return out
}
