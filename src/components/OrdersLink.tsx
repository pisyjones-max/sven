'use client'
import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ORDERS_KEY } from '@/lib/orders-client'

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb)
  window.addEventListener('doma-orders', cb)
  return () => { window.removeEventListener('storage', cb); window.removeEventListener('doma-orders', cb) }
}
const snapshot = () => { try { return localStorage.getItem(ORDERS_KEY) ?? '' } catch { return '' } }

// Кнопка видна, если у этого браузера есть заказы или он подключён к чужому кабинету
export function OrdersLink() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '')
  const [server, setServer] = useState(0)
  useEffect(() => {
    fetch('/api/me?summary=1', { cache: 'no-store' }).then(r => r.json()).then(j => setServer(j.count ?? 0)).catch(() => {})
  }, [])
  let local = 0
  try { local = raw ? (JSON.parse(raw) as unknown[]).length : 0 } catch { local = 0 }
  const n = Math.max(local, server)
  if (!n) return null
  return <Link href="/orders" className="orders-btn">Мои заказы <b>{n}</b></Link>
}
