import type { Metadata, Viewport } from 'next'
import { Header, Footer } from '@/components/Shell'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import { jsonLd, orgSchema } from '@/lib/schema'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: застройщики, дома и услуги для дома в Подмосковье`, template: `%s | ${SITE_NAME}` },
  description: 'Каталог застройщиков и строительных компаний: дома под ключ, готовые коттеджи, а также услуги для дома: забор, кровля, гараж, вывоз мусора, откачка септиков.',
  openGraph: { siteName: SITE_NAME, locale: 'ru_RU', type: 'website' },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#14532d' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <script {...jsonLd(orgSchema)} />
        <Header />
        <main className="wrap">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
