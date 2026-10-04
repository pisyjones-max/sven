import { Ad, pickAd } from '@/lib/ads'

export function AdBanner({ slot, seed, n = 0 }: { slot: 'wide' | 'side'; seed: string; n?: number }) {
  const ad: Ad | null = pickAd(slot, seed, n)
  if (!ad) return null
  const external = ad.href.startsWith('http')
  return (
    <a className={`ad ad-${slot} ad-${ad.theme}`} href={ad.href} {...(external ? { target: '_blank', rel: 'sponsored noopener' } : {})}>
      <span className="ad-label">Реклама{ad.demo ? ' · пример' : ''}</span>
      <span className="ad-icon">{ad.icon}</span>
      <span className="ad-body">
        <span className="ad-brand">{ad.brand}</span>
        <b className="ad-title">{ad.title}</b>
        <span className="ad-text">{ad.text}</span>
      </span>
      <span className="ad-cta">{ad.cta} →</span>
    </a>
  )
}
