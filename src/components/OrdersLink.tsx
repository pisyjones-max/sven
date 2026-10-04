'use client'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { ORDERS_KEY } from '@/lib/orders-client'

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb)
  window.addEventListener('doma-orders', cb)
  return () => { window.removeEventListener('storage', cb); window.removeEventListener('doma-orders', cb) }
}
const snapshot = () => { try { return localStorage.getItem(ORDERS_KEY) ?? '' } catch { return '' } }

export function OrdersLink() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '')
  let n = 0
  try { n = raw ? (JSON.parse(raw) as unknown[]).length : 0 } catch { n = 0 }
  if (!n) return null
  return <Link href="/orders" className="orders-btn">Мои заказы <b>{n}</b></Link>
}
