export function Stars({ value, count }: { value: number; count?: number }) {
  const full = Math.round(value)
  return (
    <span className="stars" aria-label={`Оценка ${value.toFixed(1)} из 5`}>
      <span className="stars-i">{'★'.repeat(full)}<span className="off">{'★'.repeat(5 - full)}</span></span>
      <b>{value.toFixed(1)}</b>
      {count !== undefined && <span className="muted small">({count})</span>}
    </span>
  )
}
