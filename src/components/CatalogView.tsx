import Link from 'next/link'
import { Category, City, CITIES, KIND_LABEL, catHref } from '@/lib/catalog'
import { Partner } from '@/lib/store'
import { PartnerCard } from './PartnerCard'
import { jsonLd, faqSchema, breadcrumbs } from '@/lib/schema'

export function CatalogView({ cat, city, partners }: { cat: Category; city?: City; partners: Partner[] }) {
  const where = city ? ` ${city.in}` : ' в Подмосковье'
  const faq = [
    { q: `Как найти исполнителя: ${cat.title.toLowerCase()}${where}?`, a: `Выберите компанию в списке, откройте её страницу и напишите в чат. Ответ придёт на эту же страницу, регистрация не нужна.` },
    { q: 'Сколько это стоит?', a: 'Цена зависит от объёма и сроков. Опишите задачу в чате, и компания назовёт стоимость.' },
    { q: 'Кому платить?', a: 'Договор и оплата напрямую с исполнителем. Платформа только передаёт заявку.' },
  ]
  const path = catHref(cat, city?.slug)
  return (
    <>
      <script {...jsonLd(faqSchema(faq))} />
      <script {...jsonLd(breadcrumbs([
        { name: 'Главная', path: '/' },
        { name: KIND_LABEL[cat.kind].title, path: `/${KIND_LABEL[cat.kind].path}` },
        { name: cat.title, path: catHref(cat) },
        ...(city ? [{ name: city.name, path }] : []),
      ]))} />
      <p className="crumbs"><Link href="/">Главная</Link> / <Link href={`/${KIND_LABEL[cat.kind].path}`}>{KIND_LABEL[cat.kind].title}</Link></p>
      <h1>{cat.h1}{where}</h1>
      <p className="lead">{cat.blurb}</p>
      {partners.length ? (
        <div className="grid">{partners.map(p => <PartnerCard key={p.id} p={p} />)}</div>
      ) : (
        <div className="card">
          <p>Компаний в этом разделе пока нет. Вы {cat.kind === 'uslugi' ? 'исполнитель' : 'застройщик'}? Станьте первым: регистрация занимает минуту.</p>
          <Link className="btn" href="/partner/register">Стать партнёром</Link>
        </div>
      )}
      <h2>Другие районы</h2>
      <p className="links">{CITIES.filter(c => c.slug !== city?.slug).map(c => <Link key={c.slug} href={catHref(cat, c.slug)}>{c.name}</Link>)}</p>
      <h2>Частые вопросы</h2>
      {faq.map(f => <details key={f.q} className="faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
    </>
  )
}
