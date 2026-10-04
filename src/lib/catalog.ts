export type Kind = 'zastroyshchiki' | 'uslugi'

export interface Category {
  slug: string
  kind: Kind
  title: string // для карточек и ссылок
  h1: string // «… в Раменском» подставляется к h1
  lead: number // стоимость лида, ₽ (для начисления)
  blurb: string
}

export const CATEGORIES: Category[] = [
  { slug: 'stroyat-i-prodayut', kind: 'zastroyshchiki', title: 'Строят и продают дома', h1: 'Застройщики: строят и продают дома', lead: 1500,
    blurb: 'Компании, которые сами возводят дома и продают их вместе с участком: коттеджные посёлки, готовые проекты, дома от застройщика.' },
  { slug: 'pod-zakaz', kind: 'zastroyshchiki', title: 'Строительство домов под заказ', h1: 'Строительство домов под заказ', lead: 1500,
    blurb: 'Строительные компании и бригады, которые строят дом по вашему проекту или по типовому проекту на вашем участке.' },
  { slug: 'gotovye-doma', kind: 'zastroyshchiki', title: 'Готовые дома и коттеджи', h1: 'Готовые дома и коттеджи на продажу', lead: 1000,
    blurb: 'Дома, которые уже построены и продаются: от дач до коттеджей с отделкой. Пишите продавцу напрямую.' },
  { slug: 'zabor', kind: 'uslugi', title: 'Забор: установка и замена', h1: 'Установка и замена забора', lead: 300,
    blurb: 'Заборы из профнастила, штакетника, сетки и сварные: монтаж под ключ или замена старого.' },
  { slug: 'krovlya', kind: 'uslugi', title: 'Кровля: монтаж и ремонт', h1: 'Монтаж и ремонт кровли', lead: 400,
    blurb: 'Монтаж кровли с нуля, ремонт протечек, замена покрытия, водостоки.' },
  { slug: 'garazh', kind: 'uslugi', title: 'Гараж и навес', h1: 'Строительство гаража и навеса', lead: 400,
    blurb: 'Гаражи, навесы для авто и хозблоки: каркасные, из блоков и металлоконструкций.' },
  { slug: 'parkovka-plitka', kind: 'uslugi', title: 'Парковка и дорожки плиткой', h1: 'Укладка плитки: парковка и дорожки', lead: 300,
    blurb: 'Мощение парковки, дорожек и площадок тротуарной плиткой с основанием и бордюрами.' },
  { slug: 'pokos-travy', kind: 'uslugi', title: 'Покос травы', h1: 'Покос травы и уход за участком', lead: 200,
    blurb: 'Покос травы триммером и косилкой, расчистка заросших участков.' },
  { slug: 'vyvoz-musora', kind: 'uslugi', title: 'Вывоз мусора', h1: 'Вывоз строительного и бытового мусора', lead: 200,
    blurb: 'Вывоз мусора после строительства и уборки участка, контейнеры и газель.' },
  { slug: 'otkachka-septika', kind: 'uslugi', title: 'Откачка септиков', h1: 'Откачка септиков и выгребных ям', lead: 200,
    blurb: 'Откачка септиков, выгребных ям и очистных, выезд ассенизатора на участок.' },
  { slug: 'uborka-snega', kind: 'uslugi', title: 'Уборка снега', h1: 'Уборка снега и чистка крыш', lead: 200,
    blurb: 'Расчистка участка и подъездов от снега, чистка кровли от снега и наледи.' },
]

export const KIND_LABEL: Record<Kind, { title: string; path: string }> = {
  zastroyshchiki: { title: 'Застройщики и дома', path: 'zastroyshchiki' },
  uslugi: { title: 'Услуги для дома', path: 'uslugi' },
}

export interface City { slug: string; name: string; in: string }
export const CITIES: City[] = [
  { slug: 'ramenskoe', name: 'Раменское', in: 'в Раменском' },
  { slug: 'zhukovskij', name: 'Жуковский', in: 'в Жуковском' },
  { slug: 'bronnicy', name: 'Бронницы', in: 'в Бронницах' },
  { slug: 'lyubercy', name: 'Люберцы', in: 'в Люберцах' },
  { slug: 'domodedovo', name: 'Домодедово', in: 'в Домодедове' },
  { slug: 'kolomna', name: 'Коломна', in: 'в Коломне' },
  { slug: 'voskresensk', name: 'Воскресенск', in: 'в Воскресенске' },
  { slug: 'egorevsk', name: 'Егорьевск', in: 'в Егорьевске' },
  { slug: 'podmoskove', name: 'Московская область', in: 'в Московской области' },
]

export const getCategory = (slug: string) => CATEGORIES.find(c => c.slug === slug)
export const getCity = (slug: string) => CITIES.find(c => c.slug === slug)
export const catsOfKind = (kind: Kind) => CATEGORIES.filter(c => c.kind === kind)
export const catHref = (c: Category, citySlug?: string) =>
  `/${KIND_LABEL[c.kind].path}/${c.slug}${citySlug ? `/${citySlug}` : ''}`

export const ICON: Record<string, string> = {
  'stroyat-i-prodayut': '🏘️', 'pod-zakaz': '🏗️', 'gotovye-doma': '🏡', zabor: '🧱', krovlya: '🏠', garazh: '🚗',
  'parkovka-plitka': '🅿️', 'pokos-travy': '🌿', 'vyvoz-musora': '🚛', 'otkachka-septika': '🚰', 'uborka-snega': '❄️',
}
