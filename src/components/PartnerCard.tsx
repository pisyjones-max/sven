import Link from 'next/link'
import { Partner } from '@/lib/store'
import { getCategory, getCity } from '@/lib/catalog'

export function PartnerCard({ p }: { p: Partner }) {
  return (
    <Link href={`/p/${p.slug}`} className="card pc">
      <b>{p.name}</b>
      <span className="muted small">{getCity(p.city)?.name}</span>
      <span className="tags">{p.cats.slice(0, 4).map(s => <i key={s}>{getCategory(s)?.title}</i>)}</span>
    </Link>
  )
}
