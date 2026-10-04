// Заглушка вместо фото: цветной блок с иконкой и подписью. Реальные фото партнёры добавят позже.
function hue(seed: string): number {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

export function Ph({ seed, icon, label, className = '' }: { seed: string; icon: string; label?: string; className?: string }) {
  const h = hue(seed)
  return (
    <div className={`ph ${className}`} style={{ background: `linear-gradient(135deg,hsl(${h} 42% 40%),hsl(${(h + 45) % 360} 48% 26%))` }}>
      <span className="ph-i">{icon}</span>
      {label && <span className="ph-l">{label}</span>}
    </div>
  )
}
