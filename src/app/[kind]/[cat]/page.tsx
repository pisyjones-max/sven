import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCategory, KIND_LABEL, catHref } from '@/lib/catalog'
import { listPublicPartners, sortPartners } from '@/lib/store'
import { CatalogView } from '@/components/CatalogView'

export const revalidate = 60
type P = { params: Promise<{ kind: string; cat: string }> }

async function resolve(p: P['params']) {
  const { kind, cat } = await p
  const c = getCategory(cat)
  return c && c.kind === kind ? c : null
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await resolve(params)
  if (!c) return {}
  return { title: `${c.h1} в Подмосковье`, description: c.blurb, alternates: { canonical: catHref(c) }, robots: process.env.SEED_DEMO === '1' ? { index: false, follow: false } : undefined }
}

export default async function CatPage({ params }: P) {
  const c = await resolve(params)
  if (!c) notFound()
  const partners = sortPartners((await listPublicPartners()).filter(p => p.cats.includes(c.slug)))
  void KIND_LABEL
  return <CatalogView cat={c} partners={partners} />
}
