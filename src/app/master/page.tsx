import type { Metadata } from 'next'
import { RegisterForm } from '@/components/RegisterForm'
import { getCategory } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Заявки для мастеров: септик, мусор, покос, снег в Раменском районе',
  description: 'Клиенты из Раменского района ищут откачку септика, вывоз мусора, покос и уборку снега. Зарегистрируйтесь за минуту и получайте заявки в Telegram.',
  alternates: { canonical: '/master' },
}

const NICHES = ['otkachka-septika', 'vyvoz-musora', 'pokos-travy', 'uborka-snega']

export default async function Page({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams
  return (
    <>
      <h1>Клиенты на откачку, вывоз, покос и снег: Раменский район</h1>
      <p className="lead">Люди пишут заявку на сайте или в Telegram. Вы отвечаете и получаете телефон клиента. Без абонентской платы.</p>

      <div className="chips" style={{ margin: '12px 0' }}>
        {NICHES.map(s => <span key={s} className="chip">{getCategory(s)?.title}</span>)}
      </div>

      <div className="card">
        <h2>Как это работает</h2>
        <ol>
          <li><b>Регистрация за минуту.</b> Телефон, что делаете, в каких районах работаете.</li>
          <li><b>Заявки в Telegram.</b> Новая заявка приходит в чат. Нажмите «Ответить», и клиент увидит ваш ответ.</li>
          <li><b>Контакт клиента открывается после вашего ответа.</b> Дальше договариваетесь сами: цена, время, оплата напрямую.</li>
        </ol>
      </div>

      <div className="card">
        <h2>Условия</h2>
        <ul>
          <li>Сейчас запуск: первые заявки бесплатно.</li>
          <li>Потом платите только за принятую заявку, от 200 ₽. Нет заявок, нет платы.</li>
          <li>Заявка не по теме или спам: нажмите «Не по теме», деньги вернём.</li>
          <li>Скидки постоянным клиентам включаются в один клик: люди возвращаются к тем, кто их ценит.</li>
        </ul>
      </div>

      <h2>Зарегистрироваться</h2>
      <RegisterForm src={src} catSlugs={NICHES} />
    </>
  )
}
