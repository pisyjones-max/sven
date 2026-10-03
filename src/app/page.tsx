import Link from 'next/link'
import { CATEGORIES, CITIES, KIND_LABEL, catHref, catsOfKind, Kind } from '@/lib/catalog'

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Дома и всё для дома в Подмосковье в одном месте</h1>
        <p>Застройщики, готовые дома, строительство под заказ, а ещё забор, кровля, гараж, вывоз мусора и откачка септика. Напишите прямо на странице компании.</p>
        <div className="cta">
          <Link className="btn" href="/zastroyshchiki">Найти застройщика</Link>
          <Link className="btn ghost" href="/uslugi">Услуги для дома</Link>
        </div>
      </section>
      {(Object.keys(KIND_LABEL) as Kind[]).map(k => (
        <section key={k}>
          <h2><Link href={`/${KIND_LABEL[k].path}`}>{KIND_LABEL[k].title}</Link></h2>
          <div className="grid">
            {catsOfKind(k).map(c => (
              <Link key={c.slug} href={catHref(c)} className="card tile"><b>{c.title}</b><span className="muted small">{c.blurb}</span></Link>
            ))}
          </div>
        </section>
      ))}
      <section>
        <h2>Как это работает</h2>
        <ol className="steps">
          <li><b>Выбираете</b> категорию и район.</li>
          <li><b>Пишете</b> компании в чат на её странице, регистрация не нужна.</li>
          <li><b>Договариваетесь</b>: компания отвечает вам прямо в чате.</li>
        </ol>
      </section>
      <section className="card cta-box">
        <h2>Вы застройщик или исполнитель?</h2>
        <p>Регистрация за минуту: телефон и категория. Заявки приходят в Telegram. Платите только за принятые заявки.</p>
        <Link className="btn" href="/partner/register">Стать партнёром</Link>
      </section>
      <section>
        <h2>Районы</h2>
        <p className="links">{CITIES.map(c => <Link key={c.slug} href={catHref(CATEGORIES[0], c.slug)}>{c.name}</Link>)}</p>
      </section>
    </>
  )
}
