import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { KIND_LABEL, catsOfKindSorted, Kind } from '@/lib/catalog'
import { listPublicPartners } from '@/lib/store'
import { catStats } from '@/lib/catstats'
import { CatCard } from '@/components/CatCard'

export const revalidate = 60
type P = { params: Promise<{ kind: string }> }
const kindOf = (s: string): Kind | null => (s in KIND_LABEL ? (s as Kind) : null)

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const k = kindOf((await params).kind)
  if (!k) return {}
  return { title: KIND_LABEL[k].title + ' в Подмосковье', description: `${KIND_LABEL[k].title}: каталог компаний Подмосковья, прямой чат с исполнителем.`, alternates: { canonical: `/${k}` } }
}

export default async function KindPage({ params }: P) {
  const k = kindOf((await params).kind)
  if (!k) notFound()
  const stats = catStats(await listPublicPartners().catch(() => []))
  return (
    <>
      <h1>{KIND_LABEL[k].title} в Подмосковье</h1>
      <div className="catgrid">
        {catsOfKindSorted(k).map(c => <CatCard key={c.slug} cat={c} count={stats[c.slug]?.count ?? 0} rating={stats[c.slug]?.rating ?? null} tag={c.hot ? 'Быстро' : undefined} />)}
      </div>
    </>
  )
}
