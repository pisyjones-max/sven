'use client'
import { useState } from 'react'
import { TG_BOT } from '@/lib/site'

// «Сообщить в Telegram, когда ответят»: клиенту не нужно проверять сайт
export function TgNotify() {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  if (!TG_BOT) return null

  async function go() {
    setBusy(true)
    try {
      const r = await fetch('/api/me/tg', { method: 'POST' })
      const j = await r.json()
      if (j.ok) { window.open(j.url, '_blank', 'noopener'); setSent(true) }
    } catch { /* сеть */ }
    setBusy(false)
  }
  return (
    <div className="tgn">
      <button className="btn ghost sm" onClick={go} disabled={busy}>🔔 Сообщить в Telegram, когда ответят</button>
      {sent && <p className="muted small">Нажмите «Старт» в Telegram, и ответы компаний будут приходить туда.</p>}
    </div>
  )
}
