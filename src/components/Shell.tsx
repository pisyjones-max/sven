import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'
import { KIND_LABEL } from '@/lib/catalog'

export function Header() {
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <Link href="/" className="logo">{SITE_NAME}</Link>
        <nav>
          <Link href={`/${KIND_LABEL.zastroyshchiki.path}`}>Застройщики</Link>
          <Link href={`/${KIND_LABEL.uslugi.path}`}>Услуги</Link>
          <Link href="/partner/register" className="btn sm">Стать партнёром</Link>
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap">
        <p>{SITE_NAME}: информационный сервис. Мы показываем компании и передаём заявки, договор заключается напрямую с исполнителем.</p>
        <p><Link href="/privacy">Политика обработки данных</Link> · <Link href="/partner/register">Разместить компанию</Link></p>
      </div>
    </footer>
  )
}
