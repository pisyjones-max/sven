import type { Metadata } from 'next'
import { OrdersClient } from '@/components/OrdersClient'

export const metadata: Metadata = { title: 'Мои заказы', robots: { index: false, follow: false } }

export default async function Page({ searchParams }: { searchParams: Promise<{ joined?: string; invite?: string }> }) {
  const q = await searchParams
  return (
    <>
      <h1>Мои заказы</h1>
      <p className="lead">Ваши заявки и переписки, оценки и расходы в одном месте.</p>
      <OrdersClient joined={q.joined === '1'} badInvite={q.invite === 'bad'} />
    </>
  )
}
