import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { KIND_LABEL, catHref, catsOfKind, Kind } from '@/lib/catalog'

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
  return (
    <>
      <h1>{KIND_LABEL[k].title} в Подмосковье</h1>
      <div className="grid">
        {catsOfKind(k).map(c => (
          <Link key={c.slug} href={catHref(c)} className="card tile"><b>{c.title}</b><span className="muted small">{c.blurb}</span></Link>
        ))}
      </div>
    </>
  )
}
