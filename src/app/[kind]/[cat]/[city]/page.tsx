import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCategory, getCity, catHref } from '@/lib/catalog'
import { listPartners } from '@/lib/store'
import { CatalogView } from '@/components/CatalogView'

export const revalidate = 60
type P = { params: Promise<{ kind: string; cat: string; city: string }> }

async function resolve(p: P['params']) {
  const { kind, cat, city } = await p
  const c = getCategory(cat)
  const ct = getCity(city)
  return c && ct && c.kind === kind ? { c, ct } : null
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const r = await resolve(params)
  if (!r) return {}
  return { title: `${r.c.h1} ${r.ct.in}`, description: `${r.c.blurb} Компании ${r.ct.in}.`, alternates: { canonical: catHref(r.c, r.ct.slug) } }
}

export default async function CityPage({ params }: P) {
  const r = await resolve(params)
  if (!r) notFound()
  const partners = (await listPartners()).filter(p => p.cats.includes(r.c.slug) && (p.city === r.ct.slug || p.city === 'podmoskove'))
  return <CatalogView cat={r.c} city={r.ct} partners={partners} />
}
