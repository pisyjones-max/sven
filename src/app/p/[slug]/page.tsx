import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPartnerBySlug } from '@/lib/store'
import { getCategory, getCity, catHref, ICON } from '@/lib/catalog'
import { ChatWidget } from '@/components/ChatWidget'
import { Ph } from '@/components/Ph'
import { AdBanner } from '@/components/AdBanner'
import { SITE_URL } from '@/lib/site'
import { jsonLd } from '@/lib/schema'

export const revalidate = 60
type P = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getPartnerBySlug((await params).slug)
  if (!p) return {}
  const cats = p.cats.map(s => getCategory(s)?.title).filter(Boolean).join(', ')
  return {
    title: `${p.name}: ${cats}`,
    description: p.desc ? p.desc.slice(0, 160) : `${p.name}, ${getCity(p.city)?.name}. ${cats}. Напишите в чат на странице.`,
    alternates: { canonical: `/p/${p.slug}` },
    robots: p.demo ? { index: false, follow: false } : undefined,
  }
}

export default async function PartnerPage({ params }: P) {
  const p = await getPartnerBySlug((await params).slug)
  if (!p) notFound()
  const city = getCity(p.city)
  const cats = p.cats.map(getCategory).filter((c): c is NonNullable<typeof c> => !!c)
  const main = cats[0]
  const icon = (main && ICON[main.slug]) || '🏠'
  const isBuilder = cats.some(c => c.kind === 'zastroyshchiki')
  return (
    <>
      <script {...jsonLd({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: p.name, url: `${SITE_URL}/p/${p.slug}`, areaServed: city?.name, description: p.desc })} />
      {p.demo && <div className="demo-note">Тестовая компания: название, цены и описание вымышленные, страница нужна для проверки вида.</div>}
      <Ph seed={p.slug} icon={icon} label={main?.title} className="hero-ph" />
      <div className="pp-grid">
        <div>
          <h1>{p.name}</h1>
          <p className="muted">
            {city?.name}{p.since ? ` · работаем с ${p.since} года` : ''}{p.price ? ` · ${p.price}` : ''}
          </p>
          {p.desc && <p className="lead-text">{p.desc}</p>}
          <p className="tags">{cats.map(c => <Link key={c.slug} href={catHref(c)}><i>{c.title}</i></Link>)}</p>

          {p.features && p.features.length > 0 && (
            <>
              <h2>Как работаем</h2>
              <ul className="ticks">{p.features.map(f => <li key={f}>{f}</li>)}</ul>
            </>
          )}

          {p.items && p.items.length > 0 && (
            <>
              <h2>{isBuilder ? 'Объекты и проекты' : 'Услуги и цены'}</h2>
              <div className="items">
                {p.items.map((it, i) => (
                  <div key={it.title} className="card item">
                    {isBuilder && <Ph seed={`${p.slug}-${i}`} icon={icon} label="Фото" className="item-ph" />}
                    <b>{it.title}</b>
                    <span className="muted small">{it.meta}</span>
                    <span className="price">{it.price}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <h2>Фото работ</h2>
          <div className="gallery">
            {[0, 1, 2].map(i => <Ph key={i} seed={`${p.slug}-g${i}`} icon={icon} label="Фото" />)}
          </div>
        </div>
        <aside>
          <ChatWidget slug={p.slug} partnerName={p.name} />
          <AdBanner slot="side" seed={p.slug} />
        </aside>
      </div>
    </>
  )
}
