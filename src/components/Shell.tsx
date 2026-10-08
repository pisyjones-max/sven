import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'
import { KIND_LABEL, CATEGORIES, catHref } from '@/lib/catalog'
import { OrdersLink } from './OrdersLink'

export function Header() {
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <Link href="/" className="logo"><span className="logo-mark">⌂</span><span className="logo-text">{SITE_NAME}</span></Link>
        <nav>
          <Link href={`/${KIND_LABEL.zastroyshchiki.path}`}>Застройщики</Link>
          <Link href={`/${KIND_LABEL.uslugi.path}`}>Услуги</Link>
          <OrdersLink />
          <Link href="/partner/register" className="btn sm">Для компаний</Link>
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-grid">
          <div>
            <b>{SITE_NAME}</b>
            <p>Информационный сервис. Мы показываем компании и передаём заявки, договор заключается напрямую с исполнителем.</p>
          </div>
          <div>
            <b>Застройщики</b>
            {CATEGORIES.filter(c => c.kind === 'zastroyshchiki').map(c => <Link key={c.slug} href={catHref(c)}>{c.title}</Link>)}
          </div>
          <div>
            <b>Услуги</b>
            {CATEGORIES.filter(c => c.kind === 'uslugi').slice(0, 6).map(c => <Link key={c.slug} href={catHref(c)}>{c.title}</Link>)}
          </div>
          <div>
            <b>Компаниям</b>
            <Link href="/master">Мастерам: получать заявки</Link>
            <Link href="/helper">Помогать соседям и подрабатывать</Link>
            <Link href="/partner/register">Разместить компанию</Link>
            <Link href="/login">Войти по номеру</Link>
            <Link href="/privacy">Политика данных</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
