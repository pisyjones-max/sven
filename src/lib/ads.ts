export interface Ad {
  id: string
  slots: ('wide' | 'side')[]
  brand: string
  title: string
  text: string
  cta: string
  href: string
  icon: string
  theme: 'orange' | 'navy' | 'green'
  demo?: boolean // пример рекламы: виден только при SEED_DEMO=1
}

// Рекламные места. Собственная реклама PLATFORMA есть всегда, примеры чужой рекламы только в демо-режиме.
export const ADS: Ad[] = [
  { id: 'platforma', slots: ['wide', 'side'], brand: 'PLATFORMA', icon: '🏠', theme: 'orange',
    title: 'Кровельные материалы для вашего дома',
    text: 'Металлочерепица, профнастил, водостоки, фасад и утепление. Быстрая доставка на объект или в пункт выдачи.',
    cta: 'Перейти в каталог', href: 'https://platforma-msk.ru' },
  { id: 'demo-usadba', slots: ['wide', 'side'], brand: 'Коттеджный посёлок «Усадьба»', icon: '🏡', theme: 'navy', demo: true,
    title: 'Участки с подрядом: осенняя акция',
    text: 'Выберите участок в готовом посёлке и сразу обсудите строительство дома. Приезжайте на показ в выходные.',
    cta: 'Узнать условия', href: '#' },
  { id: 'demo-snt', slots: ['wide', 'side'], brand: 'СНТ «Лесные дали»', icon: '🌲', theme: 'green', demo: true,
    title: 'Участки в СНТ: свет, дорога, охрана',
    text: 'Электричество на границе участка, круглогодичный подъезд. Запишитесь на просмотр.',
    cta: 'Записаться на просмотр', href: '#' },
  { id: 'demo-platform', slots: ['wide', 'side'], brand: 'Площадка-партнёр', icon: '🤝', theme: 'navy', demo: true,
    title: 'Нужен мастер в Москве? Загляните к партнёрам',
    text: 'Мы работаем в Подмосковье. В Москве исполнителей найдёте на площадке нашего партнёра.',
    cta: 'Перейти к партнёру', href: '#' },
]

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export function pickAd(slot: 'wide' | 'side', seed: string, n = 0): Ad | null {
  const demo = process.env.SEED_DEMO === '1'
  const list = ADS.filter(a => a.slots.includes(slot) && (!a.demo || demo))
  return list.length ? list[(hash(seed) + n) % list.length] : null
}
