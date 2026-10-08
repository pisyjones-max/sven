'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'

const noop = () => () => {}

// «Вас рекомендует Николай»: показывается, если пришли по ссылке с ?rec=
export function RecBanner({ slug }: { slug: string }) {
  const code = useSyncExternalStore(noop, () => new URLSearchParams(window.location.search).get('rec') ?? '', () => '')
  const [rec, setRec] = useState<{ name: string; comment: string } | null>(null)
  useEffect(() => {
    if (!code) return
    let live = true
    fetch(`/api/rec?code=${encodeURIComponent(code)}`).then(r => r.json()).then(j => { if (live && j.ok && j.slug === slug) setRec({ name: j.name, comment: j.comment }) }).catch(() => {})
    return () => { live = false }
  }, [code, slug])
  if (!rec) return null
  return (
    <div className="notice ok">
      <b>🤝 Вас рекомендует {rec.name}</b>
      {rec.comment && <p style={{ margin: '4px 0 0' }}>«{rec.comment}»</p>}
    </div>
  )
}
