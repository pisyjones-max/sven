import Link from 'next/link'
import { Category, catHref } from '@/lib/catalog'

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'компания' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'компании' : 'компаний')

// Крупная карточка раздела с картинкой: название, сколько компаний, рейтинг если он есть
export function CatCard({ cat, count, rating, tag }: { cat: Category; count: number; rating: number | null; tag?: string }) {
  return (
    <Link href={catHref(cat)} className="catcard" style={{ backgroundImage: `url(/cat/${cat.slug}.jpg), url(/ill/${cat.slug}.svg)` }}>
      <span className="catcard-grad" />
      {tag && <span className="catcard-tag">{tag}</span>}
      <b className="catcard-title">{cat.title}</b>
      <span className="catcard-meta">
        {rating !== null && <><span className="star">★</span> {rating.toFixed(1)} · </>}
        {count > 0 ? `${count} ${plural(count)}` : 'Принимаем заявки'}
      </span>
      <span className="catcard-go" aria-hidden>›</span>
    </Link>
  )
}
