'use client'
import { useState } from 'react'

const THEMES = [
  { id: 'emerald', name: 'Изумруд', c: '#0F5A44', a: '#FFC400' },
  { id: 'graphite', name: 'Графит', c: '#1D2127', a: '#B6F23A' },
  { id: 'indigo', name: 'Индиго', c: '#2E2F8F', a: '#F97316' },
  { id: 'ocean', name: 'Океан', c: '#16306B', a: '#FF6A1A' },
]

// Только в тестовом режиме: быстро примерить палитру. Выбор запоминается в браузере.
export function ThemePicker() {
  const [open, setOpen] = useState(false)
  function pick(id: string) {
    document.documentElement.setAttribute('data-theme', id)
    try { localStorage.setItem('doma-theme', id) } catch { /* ok */ }
  }
  return (
    <div className="themep">
      {open && (
        <div className="themep-list">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => pick(t.id)}>
              <span className="dot" style={{ background: `linear-gradient(135deg,${t.c} 55%,${t.a} 55%)` }} />{t.name}
            </button>
          ))}
        </div>
      )}
      <button className="themep-btn" onClick={() => setOpen(!open)} aria-label="Цвета сайта">🎨</button>
    </div>
  )
}
