import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { CATEGORIES, CITIES, KIND_LABEL, catHref } from '@/lib/catalog'
import { listPartners } from '@/lib/store'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const u = (path: string, priority: number) => ({ url: SITE_URL + path, lastModified: now, priority })
  const partners = await listPartners().catch(() => [])
  return [
    u('/', 1),
    u('/partner/register', 0.6),
    ...Object.values(KIND_LABEL).map(k => u(`/${k.path}`, 0.9)),
    ...CATEGORIES.map(c => u(catHref(c), 0.8)),
    ...CATEGORIES.flatMap(c => CITIES.map(ct => u(catHref(c, ct.slug), 0.6))),
    ...partners.map(p => u(`/p/${p.slug}`, 0.5)),
  ]
}
