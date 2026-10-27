import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCategory, getCity, catHref } from '@/lib/catalog'
import { listPublicPartners, sortPartners } from '@/lib/store'
import { CatalogView } from '@/components/CatalogView'
import { searchPartners, paginate, cleanQ, cleanPage } from '@/lib/catalog-search'

export const revalidate = 60
type Q = { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }
type P = { params: Promise<{ kind: string; cat: string; city: string }> } & Q

async function resolve(p: P['params']) {
  const { kind, cat, city } = await p
  const c = getCategory(cat)
  const ct = getCity(city)
  return c && ct && c.kind === kind ? { c, ct } : null
}

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const r = await resolve(params)
  if (!r) return {}
  return { title: `${r.c.h1} ${r.ct.in}`, description: `${r.c.blurb} Компании ${r.ct.in}.`, alternates: { canonical: catHref(r.c, r.ct.slug) }, robots: process.env.SEED_DEMO === '1' || cleanQ((await searchParams).q) || cleanPage((await searchParams).page) > 1 ? { index: false, follow: true } : undefined }
}

export default async function CityPage({ params, searchParams }: P) {
  const r = await resolve(params)
  if (!r) notFound()
  const sp = await searchParams, q = cleanQ(sp.q)
  const all = sortPartners((await listPublicPartners()).filter(p => p.cats.includes(r.c.slug) && (p.city === r.ct.slug || p.city === 'podmoskove')))
  const pg = paginate(searchPartners(all, q), cleanPage(sp.page))
  return <CatalogView cat={r.c} city={r.ct} partners={pg.items} q={q} page={pg.page} pages={pg.pages} found={pg.total} all={all.length} />
}
