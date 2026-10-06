'use client'
import { TG_BOT, MAX_BOT } from '@/lib/site'

// Тот же заказ в мессенджере: бот задаёт те же вопросы кнопками, переписка общая с сайтом
export function ChannelButtons({ cat }: { cat?: string }) {
  if (!TG_BOT && !MAX_BOT) return null
  const payload = cat ? `o_${cat}` : ''
  return (
    <div className="chan">
      <span className="muted small">Удобнее в мессенджере? Тот же заказ, тот же чат:</span>
      <div className="chan-row">
        {TG_BOT && <a className="btn ghost sm" href={`https://t.me/${TG_BOT}${payload ? `?start=${payload}` : ''}`} target="_blank" rel="noopener">Telegram</a>}
        {MAX_BOT && <a className="btn ghost sm" href={`https://max.ru/${MAX_BOT}${payload ? `/start/${payload}` : ''}`} target="_blank" rel="noopener">MAX</a>}
      </div>
    </div>
  )
}
