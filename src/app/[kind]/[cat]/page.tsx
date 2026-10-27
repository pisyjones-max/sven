import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCategory, KIND_LABEL, catHref } from '@/lib/catalog'
import { listPublicPartners, sortPartners } from '@/lib/store'
import { CatalogView } from '@/components/CatalogView'
import { searchPartners, paginate, cleanQ, cleanPage } from '@/lib/catalog-search'

export const revalidate = 60
type Q = { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }
type P = { params: Promise<{ kind: string; cat: string }> } & Q

async function resolve(p: P['params']) {
  const { kind, cat } = await p
  const c = getCategory(cat)
  return c && c.kind === kind ? c : null
}

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const c = await resolve(params)
  if (!c) return {}
  return { title: `${c.h1} в Подмосковье`, description: c.blurb, alternates: { canonical: catHref(c) }, robots: process.env.SEED_DEMO === '1' || cleanQ((await searchParams).q) || cleanPage((await searchParams).page) > 1 ? { index: false, follow: true } : undefined }
}

export default async function CatPage({ params, searchParams }: P) {
  const c = await resolve(params)
  if (!c) notFound()
  const sp = await searchParams, q = cleanQ(sp.q)
  const all = sortPartners((await listPublicPartners()).filter(p => p.cats.includes(c.slug)))
  const pg = paginate(searchPartners(all, q), cleanPage(sp.page))
  void KIND_LABEL
  return <CatalogView cat={c} partners={pg.items} q={q} page={pg.page} pages={pg.pages} found={pg.total} all={all.length} />
}
