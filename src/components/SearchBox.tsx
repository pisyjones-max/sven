'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, CITIES, KIND_LABEL, Kind, catHref, getCategory } from '@/lib/catalog'

export function SearchBox() {
  const router = useRouter()
  const [cat, setCat] = useState('')
  const [city, setCity] = useState('podmoskove')

  function go(e: React.SyntheticEvent) {
    e.preventDefault()
    const c = getCategory(cat)
    if (c) router.push(catHref(c, city === 'podmoskove' ? undefined : city))
  }

  return (
    <form className="search" onSubmit={go}>
      <select value={cat} onChange={e => setCat(e.target.value)} required aria-label="Что нужно">
        <option value="" disabled>Что нужно?</option>
        {(Object.keys(KIND_LABEL) as Kind[]).map(k => (
          <optgroup key={k} label={KIND_LABEL[k].title}>
            {CATEGORIES.filter(c => c.kind === k).map(c => <option key={c.slug} value={c.slug}>{c.title}</option>)}
          </optgroup>
        ))}
      </select>
      <select value={city} onChange={e => setCity(e.target.value)} aria-label="Район">
        {CITIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select>
      <button className="btn">Найти</button>
    </form>
  )
}
