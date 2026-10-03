import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPartnerBySlug } from '@/lib/store'
import { getCategory, getCity, catHref } from '@/lib/catalog'
import { ChatWidget } from '@/components/ChatWidget'
import { SITE_URL } from '@/lib/site'
import { jsonLd } from '@/lib/schema'
import Link from 'next/link'

export const revalidate = 60
type P = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getPartnerBySlug((await params).slug)
  if (!p) return {}
  const cats = p.cats.map(s => getCategory(s)?.title).filter(Boolean).join(', ')
  return { title: `${p.name}: ${cats}`, description: `${p.name}, ${getCity(p.city)?.name}. ${cats}. Напишите в чат на странице.`, alternates: { canonical: `/p/${p.slug}` } }
}

export default async function PartnerPage({ params }: P) {
  const p = await getPartnerBySlug((await params).slug)
  if (!p) notFound()
  const city = getCity(p.city)
  return (
    <>
      <script {...jsonLd({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: p.name, url: `${SITE_URL}/p/${p.slug}`, areaServed: city?.name })} />
      <h1>{p.name}</h1>
      <p className="muted">{city?.name}</p>
      <p className="tags">{p.cats.map(s => { const c = getCategory(s); return c ? <Link key={s} href={catHref(c)}><i>{c.title}</i></Link> : null })}</p>
      <ChatWidget slug={p.slug} partnerName={p.name} />
    </>
  )
}
