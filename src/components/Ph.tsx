// Картинка раздела. Своё фото: положите public/cat/<раздел>.jpg, оно ляжет поверх иллюстрации public/ill/<раздел>.svg.
function hue(seed: string): number {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

const POS = ['20% 40%', '55% 75%', '85% 30%']

export function Ph({ seed, icon, label, className = '', cat, variant }: { seed: string; icon: string; label?: string; className?: string; cat?: string; variant?: number }) {
  if (cat) {
    const style: React.CSSProperties = { backgroundImage: `url(/cat/${cat}.jpg), url(/ill/${cat}.svg)` }
    if (variant !== undefined) { style.backgroundPosition = POS[variant % 3]; style.backgroundSize = '230%' }
    return (
      <div className={`ph ph-img ${className}`} style={style}>
        {label && <span className="ph-chip">{label}</span>}
      </div>
    )
  }
  const h = hue(seed)
  return (
    <div className={`ph ${className}`} style={{ background: `linear-gradient(135deg,hsl(${h} 42% 40%),hsl(${(h + 45) % 360} 48% 26%))` }}>
      <span className="ph-i">{icon}</span>
      {label && <span className="ph-l">{label}</span>}
    </div>
  )
}
