import { SITE_NAME, SITE_URL } from './site'

export const jsonLd = (o: unknown) => ({ type: 'application/ld+json', dangerouslySetInnerHTML: { __html: JSON.stringify(o).replace(/</g, '\\u003c') } })

export const orgSchema = { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: SITE_URL }

export const faqSchema = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: items.map(i => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
})

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: SITE_URL + it.path })),
})
