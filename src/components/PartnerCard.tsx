import Link from 'next/link'
import { Partner, avgRating } from '@/lib/store'
import { getCategory, getCity, ICON } from '@/lib/catalog'
import { Ph } from './Ph'
import { Stars } from './Stars'

export function PartnerCard({ p }: { p: Partner }) {
  const main = getCategory(p.cats[0])
  return (
    <Link href={`/p/${p.slug}`} className="pcard">
      <Ph seed={p.slug} icon={(main && ICON[main.slug]) || '🏠'} className="pcard-ph" />
      <div className="pcard-body">
        <b className="pcard-name">{p.name}{p.demo && <em className="badge">тест</em>}</b>
        <span className="muted small">{getCity(p.city)?.name}{p.since ? ` · с ${p.since} года` : ''}</span>
        {avgRating(p) !== null && <Stars value={avgRating(p)!} count={p.rCount} />}
        {p.price && <span className="price">{p.price}</span>}
        {p.desc && <span className="pcard-desc">{p.desc.slice(0, 120)}{p.desc.length > 120 ? '…' : ''}</span>}
        <span className="tags">{p.cats.slice(0, 3).map(s => <i key={s}>{getCategory(s)?.title}</i>)}</span>
      </div>
      <span className="pcard-cta">{p.imported && !p.claimed ? 'Контакты →' : 'Написать →'}</span>
    </Link>
  )
}
