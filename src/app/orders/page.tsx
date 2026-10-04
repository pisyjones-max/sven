import type { Metadata } from 'next'
import { OrdersClient } from '@/components/OrdersClient'

export const metadata: Metadata = { title: 'Мои заказы', robots: { index: false, follow: false } }

export default function Page() {
  return (
    <>
      <h1>Мои заказы</h1>
      <p className="lead">Здесь ваши заявки и переписки, оценки и расходы. Заказы хранятся в этом браузере.</p>
      <OrdersClient />
    </>
  )
}
