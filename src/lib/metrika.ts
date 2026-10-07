// Цели Яндекс.Метрики. Работает только если задан NEXT_PUBLIC_YM_ID, иначе ничего не делает.
type Ym = (id: number, action: string, goal: string, params?: Record<string, unknown>) => void
export function goal(name: string, params?: Record<string, unknown>) {
  const id = Number(process.env.NEXT_PUBLIC_YM_ID)
  const ym = typeof window !== 'undefined' ? (window as unknown as { ym?: Ym }).ym : undefined
  if (id && ym) try { ym(id, 'reachGoal', name, params) } catch { /* аналитика не должна ломать форму */ }
}
