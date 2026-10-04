export function fmtResponse(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} мин`
  const h = Math.round(min / 60)
  return h < 24 ? `${h} ч` : 'более суток'
}
