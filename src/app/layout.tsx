import type { Metadata, Viewport } from 'next'
import { Header, Footer } from '@/components/Shell'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import { jsonLd, orgSchema } from '@/lib/schema'
import { ThemePicker } from '@/components/ThemePicker'
import { AppChrome } from '@/components/AppChrome'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: застройщики, дома и услуги для дома в Подмосковье`, template: `%s | ${SITE_NAME}` },
  description: 'Каталог застройщиков и строительных компаний: дома под ключ, готовые коттеджи, а также услуги для дома: забор, кровля, гараж, вывоз мусора, откачка септиков.',
  openGraph: { siteName: SITE_NAME, locale: 'ru_RU', type: 'website' },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0F5A44' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme={process.env.NEXT_PUBLIC_THEME || undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('doma-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
      </head>
      <body>
        <script {...jsonLd(orgSchema)} />
        <Header />
        <main className="wrap">{children}</main>
        <Footer />
        <AppChrome />
        {process.env.SEED_DEMO === '1' && <ThemePicker />}
      </body>
    </html>
  )
}
