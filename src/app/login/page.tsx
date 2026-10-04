import type { Metadata } from 'next'
import { LoginClient } from '@/components/LoginClient'

export const metadata: Metadata = { title: 'Войти', robots: { index: false, follow: false } }

export default function Page() {
  return (
    <>
      <h1>Войти</h1>
      <p className="lead">Уже заказывали? Введите номер телефона, пришлём код, и ваши заказы откроются на этом устройстве.</p>
      <div className="card" style={{ maxWidth: 420 }}><LoginClient /></div>
    </>
  )
}
