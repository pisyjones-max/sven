import Link from 'next/link'
import { CATEGORIES, CITIES, KIND_LABEL, catHref, catsOfKindSorted, hotNow, seasonTitle } from '@/lib/catalog'
import { listPublicPartners } from '@/lib/store'
import { catStats } from '@/lib/catstats'
import { SearchBox } from '@/components/SearchBox'
import { AdBanner } from '@/components/AdBanner'
import { OrderWizard } from '@/components/OrderWizard'
import { CatCard } from '@/components/CatCard'
import { Scroller } from '@/components/Scroller'

export const revalidate = 60

export default async function Home() {
  const stats = catStats(await listPublicPartners().catch(() => []))
  const hot = hotNow()
  const hotSlugs = new Set(hot.map(c => c.slug))
  const others = catsOfKindSorted('uslugi').filter(c => !hotSlugs.has(c.slug))
  const card = (c: (typeof CATEGORIES)[number], tag?: string) => <CatCard key={c.slug} cat={c} count={stats[c.slug]?.count ?? 0} rating={stats[c.slug]?.rating ?? null} tag={tag} />
  return (
    <>
      <section className="hero">
        <div className="hero-art" aria-hidden>
          {hot.slice(0, 3).map((c, i) => <span key={c.slug} className={`hero-img hi-${i}`} style={{ backgroundImage: `url(/cat/${c.slug}.jpg), url(/ill/${c.slug}.svg)` }}><b>{c.title}</b></span>)}
        </div>
        <div className="hero-in">
          <span className="eyebrow">Подмосковье · мастер приедет быстро</span>
          <h1>Откачка септика, вывоз мусора, покос и уборка снега</h1>
          <p>Мастера вашего района отвечают в чате. Платите исполнителю напрямую, наличными или переводом, без предоплаты платформе.</p>
          <SearchBox />
          <div className="quick">
            {hot.slice(0, 5).map(c => <Link key={c.slug} href={catHref(c)} className="quick-i">{c.title}</Link>)}
          </div>
          <ul className="trust">
            <li>Без регистрации</li>
            <li>Ответ в чате на сайте</li>
            <li>Платите исполнителю напрямую</li>
          </ul>
        </div>
      </section>

      <section>
        <div className="sec-head">
          <h2>Нужен мастер срочно</h2>
          <span className="muted small">{seasonTitle()}</span>
        </div>
        <Scroller>{hot.map((c, i) => card(c, i === 0 ? 'Сейчас в сезоне' : undefined))}</Scroller>
      </section>

      <AdBanner slot="wide" seed="home" n={0} />

      <section className="band">
        <div className="band-text">
          <h2>Оставьте заявку, мастер перезвонит</h2>
          <p>Одна заявка уходит сразу нескольким компаниям вашего района. Они напишут в чат с ценой и временем приезда.</p>
          <ul className="ticks light">
            <li>Ответ обычно в течение часа</li>
            <li>Сравниваете цены в одном месте</li>
            <li>Ничего не платите за подбор</li>
          </ul>
        </div>
        <OrderWizard />
      </section>

      {others.length > 0 && (
        <section>
          <div className="sec-head">
            <h2>Ещё для дома и участка</h2>
            <Link href={`/${KIND_LABEL.uslugi.path}`}>Все услуги →</Link>
          </div>
          <Scroller>{others.map(c => card(c))}</Scroller>
        </section>
      )}

      <section>
        <div className="sec-head">
          <h2>Дома и застройщики</h2>
          <Link href={`/${KIND_LABEL.zastroyshchiki.path}`}>Все →</Link>
        </div>
        <Scroller>{catsOfKindSorted('zastroyshchiki').map(c => card(c))}</Scroller>
      </section>

      <section>
        <h2>Как это работает</h2>
        <div className="steps3">
          <div><span>1</span><b>Выбираете</b><p>Услугу и район: септик, мусор, покос, снег.</p></div>
          <div><span>2</span><b>Пишете</b><p>В чат компании или одной заявкой сразу нескольким.</p></div>
          <div><span>3</span><b>Договариваетесь</b><p>Мастер называет цену и время, платите ему напрямую.</p></div>
        </div>
      </section>

      <section className="loy-home">
        <div>
          <h2>Постоянным клиентам скидки</h2>
          <p>Компании дают накопительные скидки. Заказы всех, кого вы подключили в кабинет по QR-коду, копятся вместе: родителям тоже скидка.</p>
        </div>
        <ul className="ticks">
          <li>Заказали, мастер подтвердил работу, заказ засчитан</li>
          <li>Родные заходят по QR-коду, без регистрации</li>
          <li>Прогресс скидки виден в «Моих заказах»</li>
        </ul>
      </section>

      <AdBanner slot="wide" seed="home" n={1} />

      <section className="biz">
        <div>
          <h2>Вы мастер или компания?</h2>
          <p>Получайте заявки прямо в Telegram.</p>
          <ul className="ticks light">
            <li>Регистрация за 30 секунд: телефон и категория</li>
            <li>Заявки приходят в Telegram, отвечаете оттуда</li>
            <li>Платите только за принятые заявки</li>
          </ul>
        </div>
        <Link className="btn big" href="/partner/register">Разместить компанию</Link>
      </section>

      <section>
        <h2>Районы Подмосковья</h2>
        <p className="links">{CITIES.map(c => <Link key={c.slug} href={catHref(CATEGORIES.find(x => x.slug === 'otkachka-septika') ?? CATEGORIES[0], c.slug)} className="pill">{c.name}</Link>)}</p>
      </section>
    </>
  )
}
