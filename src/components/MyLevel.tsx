'use client'
import { useEffect, useState } from 'react'

interface Level { done: number; percent: number; next: { orders: number; percent: number; left: number } | null }

// Личный уровень скидки посетителя у этой компании (если у него есть кабинет)
export function MyLevel({ slug }: { slug: string }) {
  const [lv, setLv] = useState<Level | null>(null)
  useEffect(() => {
    fetch(`/api/me/loyalty?slug=${slug}`, { cache: 'no-store' }).then(r => r.json()).then(j => setLv(j.level)).catch(() => {})
  }, [slug])
  if (!lv || lv.done === 0) return null
  return (
    <div className="notice ok small">
      <b>Ваш уровень: скидка {lv.percent}%.</b> Выполнено заказов: {lv.done}{lv.next ? `, ещё ${lv.next.left} до ${lv.next.percent}%` : '. Это максимум.'}
    </div>
  )
}
