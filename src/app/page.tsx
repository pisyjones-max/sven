import Link from 'next/link'
import { CATEGORIES, CITIES, ICON, KIND_LABEL, catHref, catsOfKind, Kind } from '@/lib/catalog'
import { SearchBox } from '@/components/SearchBox'
import { AdBanner } from '@/components/AdBanner'
import { LeadForm } from '@/components/LeadForm'

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-in">
          <span className="eyebrow">Подмосковье · {CATEGORIES.length} направлений · {CITIES.length - 1} районов</span>
          <h1>Построить дом, купить готовый или обустроить участок</h1>
          <p>Застройщики, готовые дома и мастера в одном месте. Напишите компании в чат, регистрация не нужна.</p>
          <SearchBox />
          <ul className="trust">
            <li>Без регистрации</li>
            <li>Ответ в чате на сайте</li>
            <li>Платите исполнителю напрямую</li>
          </ul>
        </div>
      </section>

      <AdBanner slot="wide" seed="home" n={0} />

      {(Object.keys(KIND_LABEL) as Kind[]).map(k => (
        <section key={k}>
          <div className="sec-head">
            <h2>{KIND_LABEL[k].title}</h2>
            <Link href={`/${KIND_LABEL[k].path}`}>Все →</Link>
          </div>
          <div className="tiles">
            {catsOfKind(k).map(c => (
              <Link key={c.slug} href={catHref(c)} className="tile2">
                <span className="tile-ic">{ICON[c.slug]}</span>
                <b>{c.title}</b>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="band">
        <div className="band-text">
          <h2>Не знаете, к кому обратиться?</h2>
          <p>Оставьте заявку, и мы отправим её до трёх подходящим компаниям. Они напишут вам в чат с ценой и сроками.</p>
          <ul className="ticks light">
            <li>Одна заявка вместо десяти звонков</li>
            <li>Сравниваете предложения в одном месте</li>
            <li>Ничего не платите за подбор</li>
          </ul>
        </div>
        <LeadForm />
      </section>

      <section>
        <h2>Как это работает</h2>
        <div className="steps3">
          <div><span>1</span><b>Выбираете</b><p>Категорию и район: дом, забор, кровля, вывоз мусора.</p></div>
          <div><span>2</span><b>Пишете</b><p>В чат компании или одной заявкой сразу нескольким.</p></div>
          <div><span>3</span><b>Договариваетесь</b><p>Компания отвечает вам в чате, цену и сроки обсуждаете напрямую.</p></div>
        </div>
      </section>

      <section className="loy-home">
        <div>
          <h2>Копите скидки всей семьёй</h2>
          <p>Компании дают постоянным клиентам накопительные скидки. Заказы всех, кого вы подключили в свой кабинет по QR-коду, копятся вместе, поэтому скидка растёт быстрее.</p>
        </div>
        <ul className="ticks">
          <li>Заказали, компания подтвердила работу, и заказ засчитан</li>
          <li>Родители и близкие заходят по QR-коду, без регистрации</li>
          <li>Прогресс скидки виден в «Моих заказах»</li>
        </ul>
      </section>

      <AdBanner slot="wide" seed="home" n={1} />

      <section className="biz">
        <div>
          <h2>Вы застройщик или мастер?</h2>
          <p>Получайте заявки на дома и услуги прямо в Telegram.</p>
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
        <p className="links">{CITIES.map(c => <Link key={c.slug} href={catHref(CATEGORIES[0], c.slug)} className="pill">{c.name}</Link>)}</p>
      </section>
    </>
  )
}
