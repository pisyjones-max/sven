'use client'
import { useRef } from 'react'

// Горизонтальная лента карточек со стрелкой
export function Scroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div className="scroller">
      <div ref={ref} className="scroller-in">{children}</div>
      <button type="button" className="scroller-btn" aria-label="Дальше" onClick={() => ref.current?.scrollBy({ left: 380, behavior: 'smooth' })}>›</button>
    </div>
  )
}
