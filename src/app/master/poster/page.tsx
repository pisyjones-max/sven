import type { Metadata } from 'next'
import QRCode from 'qrcode'
import { SITE_NAME, SITE_URL } from '@/lib/site'

export const metadata: Metadata = { title: 'Плакат для мастеров', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Печатный плакат A4 с QR-кодом. Свой QR для каждого, кто раздаёт: /master/poster?ref=ivan, регистрации помечаются источником
export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams
  const src = (ref ?? 'poster').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'poster'
  const url = `${SITE_URL}/master?src=${src}`
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 520, errorCorrectionLevel: 'M' })
  const short = url.replace(/^https?:\/\//, '')
  return (
    <>
      <style>{`
        .poster{max-width:760px;margin:0 auto;text-align:center;padding:24px 16px}
        .poster h1{font-size:44px;line-height:1.1;margin:0 0 12px}
        .poster .sub{font-size:22px;margin:0 0 18px}
        .poster .tags{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:0 0 18px}
        .poster .tags span{border:2px solid #111;border-radius:99px;padding:8px 16px;font-size:20px;font-weight:700}
        .poster .qr{width:min(420px,80%);margin:0 auto}
        .poster .qr svg{width:100%;height:auto;display:block}
        .poster .scan{font-size:26px;font-weight:800;margin:14px 0 4px}
        .poster .url{font-size:20px;word-break:break-all}
        .poster .terms{font-size:18px;margin-top:18px}
        .printbar{max-width:760px;margin:0 auto;padding:8px 16px}
        @media print{.hdr,.ftr,.printbar,.sheet,.dock,[class*="bottom"],[class*="fab"]{display:none!important}main.wrap{padding:0!important;max-width:none!important}.poster{padding:0}@page{size:A4;margin:12mm}}
      `}</style>
      <div className="printbar small muted">Откройте меню браузера → «Печать», формат A4. Ссылка для своего QR: <code>/master/poster?ref=имя</code></div>
      <div className="poster">
        <h1>Вы мастер? Получайте заявки в Раменском районе</h1>
        <p className="sub">Откачка септика · вывоз мусора · покос · уборка снега</p>
        <div className="tags"><span>Заявки в Telegram</span><span>Без абонентской платы</span><span>Первые заявки бесплатно</span></div>
        <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="scan">Наведите камеру и зарегистрируйтесь за минуту</p>
        <p className="url">{short}</p>
        <p className="terms">{SITE_NAME}. Платите только за принятые заявки, спам вернём.</p>
      </div>
    </>
  )
}
