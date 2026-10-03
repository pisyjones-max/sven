import type { Metadata } from 'next'
import { CabinetClient } from '@/components/CabinetClient'
import { TG_BOT } from '@/lib/site'

export const metadata: Metadata = { title: 'Кабинет партнёра', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <CabinetClient token={token} tgLink={TG_BOT ? `https://t.me/${TG_BOT}?start=${token}` : null} />
}
