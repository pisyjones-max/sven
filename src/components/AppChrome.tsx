'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { OrderWizard } from './OrderWizard'
import { ChatWidget } from './ChatWidget'
import { ChannelButtons } from './ChannelButtons'
import { CATEGORIES } from '@/lib/catalog'

const KINDS = ['uslugi', 'zastroyshchiki']
const DISPATCH_ASKS = ['Нужен мастер', 'Не нашёл нужную услугу', 'Вопрос по заказу', 'Хочу подключить компанию']

function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <div className="sheet" role="dialog" aria-modal>
      <div className="sheet-bg" onClick={onClose} />
      <div className="sheet-box">
        <button className="sheet-x" onClick={onClose} aria-label="Закрыть">×</button>
        {children}
      </div>
    </div>
  )
}

// Мобильная нижняя панель (Главная, Услуги, Заявка, Заказы, Чат) и общий чат с диспетчером на любой странице
export function AppChrome() {
  const path = usePathname() ?? '/'
  const [sheet, setSheet] = useState<{ kind: 'order' | 'chat'; at: string } | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const o = () => setSheet({ kind: 'order', at: location.pathname }), c = () => setSheet({ kind: 'chat', at: location.pathname })
    window.addEventListener('doma-open-order', o)
    window.addEventListener('doma-open-chat', c)
    return () => { window.removeEventListener('doma-open-order', o); window.removeEventListener('doma-open-chat', c) }
  }, [])
  useEffect(() => {
    fetch('/api/me?summary=1', { cache: 'no-store' }).then(r => r.json()).then(j => setCount(j.count ?? 0)).catch(() => {})
  }, [path])

  const open = sheet && sheet.at === path ? sheet.kind : null // окно закрывается само при переходе на другую страницу
  const setOpen = (k: 'order' | 'chat' | null) => setSheet(k ? { kind: k, at: path } : null)
  const seg = path.split('/').filter(Boolean)
  const catFromPath = KINDS.includes(seg[0] ?? '') && CATEGORIES.some(c => c.slug === seg[1]) ? seg[1] : undefined
  const cityFromPath = catFromPath ? seg[2] : undefined
  const on = (p: string) => (p === '/' ? path === '/' : path.startsWith(p))

  return (
    <>
      <nav className="bnav" aria-label="Основное меню">
        <Link href="/" className={on('/') ? 'on' : ''}><i>🏠</i>Главная</Link>
        <Link href="/uslugi" className={on('/uslugi') ? 'on' : ''}><i>🛠</i>Услуги</Link>
        <button className="bnav-main" onClick={() => setOpen('order')}><i>＋</i>Заявка</button>
        <Link href="/orders" className={on('/orders') ? 'on' : ''}><i>📋</i>Заказы{count > 0 && <b className="bnav-badge">{count}</b>}</Link>
        <button onClick={() => setOpen('chat')}><i>💬</i>Чат</button>
      </nav>
      <button className="float-chat" onClick={() => setOpen('chat')}>💬 Чат с диспетчером</button>

      {open === 'order' && <Sheet onClose={() => setOpen(null)}><OrderWizard cat={catFromPath} city={cityFromPath} title="Быстрая заявка" /></Sheet>}
      {open === 'chat' && (
        <Sheet onClose={() => setOpen(null)}>
          <p className="muted small" style={{ margin: '0 0 8px' }}>Диспетчер подскажет, подберёт мастера и ответит на вопросы.</p>
          <ChatWidget slug="dispatcher" partnerName="Диспетчер" asks={DISPATCH_ASKS} />
          <ChannelButtons />
        </Sheet>
      )}
    </>
  )
}
