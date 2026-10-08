import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPartnerBySlug, avgRating, isLive, listReviews } from '@/lib/store'
import { getCategory, getCity, catHref, ICON } from '@/lib/catalog'
import { ChatWidget } from '@/components/ChatWidget'
import { OrderWizard } from '@/components/OrderWizard'
import { Ph } from '@/components/Ph'
import { AdBanner } from '@/components/AdBanner'
import { Stars } from '@/components/Stars'
import { ClaimForm } from '@/components/ClaimForm'
import { MyLevel } from '@/components/MyLevel'
import { RecBanner } from '@/components/RecBanner'
import { isAvailable, isHelper, recsFor } from '@/lib/people'
import { TrustBadges } from '@/components/TrustBadges'
import { formatPhone } from '@/lib/phone'
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
  const live = isLive(p)
  const rating = avgRating(p)
  const reviews = await listReviews(p.id)
  const recN = new Set((await recsFor(p.id)).map(r => r.acctId)).size
  const isBuilder = cats.some(c => c.kind === 'zastroyshchiki')
  return (
    <>
      <script {...jsonLd({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: p.name, url: `${SITE_URL}/p/${p.slug}`, areaServed: city?.name, description: p.desc })} />
      {p.demo && <div className="demo-note">Тестовая компания: название, цены и описание вымышленные, страница нужна для проверки вида.</div>}
      <Ph seed={p.slug} icon={icon} cat={main?.slug} label={main?.title} className="hero-ph" hero />
      <div className="pp-grid">
        <div>
          <h1>{p.name}</h1>
          <p className="muted">
            {city?.name}{p.since ? ` · работаем с ${p.since} года` : ''}{p.price ? ` · ${p.price}` : ''}
          </p>
          {isAvailable(p) && <p><span className="chip on">🟢 Свободен сейчас{p.available?.note ? `: ${p.available.note}` : ''}</span></p>}
          {isHelper(p) && <p><span className="chip on">🤝 Сосед-помощник</span></p>}
          <RecBanner slug={p.slug} />
          <TrustBadges p={p} />
          {recN > 0 && <p className="muted">🤝 Рекомендуют: {recN} {recN === 1 ? 'человек' : recN < 5 ? 'человека' : 'человек'} из тех, кто с ними работал</p>}
          {rating !== null && <p><Stars value={rating} count={p.rCount} /></p>}
          {p.desc && <p className="lead-text">{p.desc}</p>}
          <p className="tags">{cats.map(c => <Link key={c.slug} href={catHref(c)}><i>{c.title}</i></Link>)}</p>

          {p.loyalty && (
            <div className="card loy-card">
              <h3>🎁 Скидки постоянным клиентам</h3>
              <ul className="ticks">{p.loyalty.tiers.map(t => <li key={t.orders}>После {t.orders} выполненных заказов: скидка {t.percent}%</li>)}</ul>
              <p className="muted small">Заказы всех в вашем кабинете копятся вместе, можно подключить семью по QR-коду. Скидку предоставляет компания, условия у каждой свои.</p>
              <MyLevel slug={p.slug} />
            </div>
          )}

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
                    {isBuilder && <Ph seed={`${p.slug}-${i}`} icon={icon} cat={main?.slug} variant={i} className="item-ph" />}
                    <b>{it.title}</b>
                    <span className="muted small">{it.meta}</span>
                    <span className="price">{it.price}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {reviews.length > 0 && (
            <>
              <h2>Отзывы клиентов</h2>
              {reviews.map((r, i) => (
                <div key={i} className="card review">
                  <Stars value={r.stars} />
                  <p>{r.comment}</p>
                  <span className="muted small">{r.name} · {new Date(r.at).toLocaleDateString('ru-RU')}</span>
                </div>
              ))}
            </>
          )}

          <h2>Фото работ</h2>
          <div className="gallery">
            {[0, 1, 2].map(i => <Ph key={i} seed={`${p.slug}-g${i}`} icon={icon} cat={main?.slug} variant={i} />)}
          </div>
        </div>
        <aside>
          {live ? <><OrderWizard slug={p.slug} cats={p.cats} cat={p.cats.length === 1 ? p.cats[0] : undefined} title="Быстрый заказ" /><ChatWidget slug={p.slug} partnerName={p.name} builder={isBuilder} /></> : (
            <div className="card contact">
              <h3>Контакты</h3>
              {p.phone && <a className="btn big" href={`tel:+${p.phone}`}>Позвонить {formatPhone('+' + p.phone)}</a>}
              {p.source && <a className="btn ghost big" href={p.source.url} target="_blank" rel="nofollow sponsored noopener">Подробнее на {p.source.name} →</a>}
              <p className="muted small">Компания добавлена из открытого источника и пока не подключена к чату на платформе.</p>
              <ClaimForm slug={p.slug} />
            </div>
          )}
          <AdBanner slot="side" seed={p.slug} />
        </aside>
      </div>
    </>
  )
}
