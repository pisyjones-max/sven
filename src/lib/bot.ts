import { CATEGORIES, CITIES, ICON, getCategory, getCity, hotNow } from './catalog'
import { composeRequest, questionsFor } from './questions'
import { kvGet, kvSet } from './kv'
import { SITE_URL } from './site'
import { dispatchLead } from './lead'
import { accountByPhone, accountConvs, bindChat, bindFromToken, bindPhone, chatAccount, createAccount, getAccount, mergeInto } from './account'
import { clientSays } from './chat'
import { Adapter, Btn, lookupClientMsg } from './channels'
import { getConv } from './store'
import { normalizePhone, isPlausiblePhone } from './phone'

// Один сценарий для всех мессенджеров: те же вопросы кнопками, что и мастер заявки на сайте.
// Переписка общая: сообщения клиента попадают в тот же чат с компанией, ответы компании приходят в мессенджер.
export interface Incoming {
  chatId: string
  name: string
  text?: string
  data?: string // нажатая кнопка
  cbId?: string
  phone?: string // отправленный контакт
  phoneVerified?: boolean // номер принадлежит самому пользователю
  replyTo?: string // на какое сообщение бота ответили
  start?: string // /start или bot_started, значение это параметр ссылки
}

interface St { step: 'idle' | 'q' | 'city' | 'phone'; cat?: string; qi?: number; answers?: Record<string, string>; city?: string }
const stKey = (ad: Adapter, chat: string) => `botst:${ad.ch}:${chat}`
const rows = (btns: Btn[], per = 2): Btn[][] => Array.from({ length: Math.ceil(btns.length / per) }, (_, i) => btns.slice(i * per, i * per + per))

async function menu(ad: Adapter, chat: string, more = false, hello = false) {
  const hot = hotNow()
  const hotSet = new Set(hot.map(c => c.slug))
  const list = more ? CATEGORIES.filter(c => !hotSet.has(c.slug)) : hot
  const kb = rows(list.map(c => ({ text: `${ICON[c.slug] ?? ''} ${c.title}`, data: `c:${c.slug}` })))
  kb.push(more ? [{ text: '⬅ Назад', data: 'm' }] : [{ text: 'Ещё услуги и дома', data: 'more' }])
  await ad.send(chat, `${hello ? 'Здравствуйте! Подберу мастера в Подмосковье.\n\n' : ''}Что нужно?`, kb)
}

async function ask(ad: Adapter, chat: string, st: St) {
  const qs = questionsFor(st.cat!)
  const qi = st.qi ?? 0
  const q = qs[qi]
  const kb = rows(q.options.map((o, j) => ({ text: o, data: `a:${qi}:${j}` })))
  kb.push([{ text: '✖ Отмена', data: 'x' }])
  await ad.send(chat, `${getCategory(st.cat!)?.title} · ${qi + 1}/${qs.length}\n\n${q.title}`, kb)
}

async function askCity(ad: Adapter, chat: string) {
  await ad.send(chat, 'В каком районе?', rows(CITIES.map(c => ({ text: c.name, data: `y:${c.slug}` }))))
}

async function resolveAccount(ad: Adapter, chat: string): Promise<string> {
  const id = await chatAccount(ad.ch, chat)
  if (id) return id
  const a = await createAccount()
  await bindChat(ad.ch, a.id, chat)
  return a.id
}

async function finalize(ad: Adapter, inc: Incoming, st: St, phone: string, verified: boolean) {
  const chat = inc.chatId
  const cat = getCategory(st.cat ?? '')
  if (!cat) return menu(ad, chat)
  let acctId = await resolveAccount(ad, chat)
  if (verified) {
    // Номер подтверждён самим мессенджером: привязываем к кабинету или подключаем уже существующий кабинет с этим номером
    const ex = await accountByPhone(phone)
    if (ex && ex.id !== acctId) { await mergeInto(ex.id, acctId); await bindChat(ad.ch, ex.id, chat); acctId = ex.id }
    else if (!ex) await bindPhone(acctId, phone)
  }
  const city = getCity(st.city ?? '')
  const text = composeRequest(cat.title, city?.name, cat.slug, st.answers, '')
  const sent = await dispatchLead({ cat, city, name: inc.name || 'Клиент', phone, text, acctId })
  await kvSet(stKey(ad, chat), { step: 'idle' } satisfies St)
  if (sent.length) {
    await ad.send(chat, `Готово! Заявка отправлена: ${sent.map(s => s.name).join(', ')}.\n\nОтветы придут сюда. Чтобы написать компании, нажмите «Ответить» на её сообщение. Всё сохраняется и в чате на сайте: ${SITE_URL}/orders`)
  } else {
    await ad.send(chat, 'Заявка принята. Пока в этом разделе нет компаний, передадим её, как только они появятся.')
  }
}

async function needPhone(ad: Adapter, inc: Incoming, st: St) {
  const acctId = await chatAccount(ad.ch, inc.chatId)
  const acct = acctId ? await getAccount(acctId) : null
  if (acct?.phone) return finalize(ad, inc, st, acct.phone, true) // номер уже известен
  await kvSet(stKey(ad, inc.chatId), { ...st, step: 'phone' } satisfies St)
  await ad.askPhone(inc.chatId, 'Последний шаг: отправьте номер телефона кнопкой ниже или напишите его в чат. Компания позвонит или напишет вам.')
}

async function startOrder(ad: Adapter, chat: string, cat: string) {
  const st: St = { step: 'q', cat, qi: 0, answers: {} }
  await kvSet(stKey(ad, chat), st)
  await ask(ad, chat, st)
}

export async function handleBot(ad: Adapter, inc: Incoming) {
  const chat = inc.chatId
  let st = (await kvGet<St>(stKey(ad, chat))) ?? { step: 'idle' }
  const save = (s: St) => { st = s; return kvSet(stKey(ad, chat), s) }

  // --- ссылка /start с параметром
  if (inc.start !== undefined) {
    const p = inc.start
    if (p.startsWith('c_')) {
      const ok = await bindFromToken(ad.ch, p.slice(2), chat)
      return void (await ad.send(chat, ok ? `Готово! Сюда придут ответы компаний на ваши заказы.\nЗаказы на сайте: ${SITE_URL}/orders` : 'Ссылка устарела. Откройте сайт и нажмите кнопку подключения ещё раз.'))
    }
    if (p.startsWith('o_') && getCategory(p.slice(2))) return startOrder(ad, chat, p.slice(2))
    await save({ step: 'idle' })
    return menu(ad, chat, false, true)
  }

  // --- нажатие кнопки
  if (inc.data) {
    if (inc.cbId) await ad.ack(inc.cbId)
    const d = inc.data
    if (d === 'm') return menu(ad, chat)
    if (d === 'more') return menu(ad, chat, true)
    if (d === 'x') { await save({ step: 'idle' }); return menu(ad, chat) }
    if (d.startsWith('c:') && getCategory(d.slice(2))) return startOrder(ad, chat, d.slice(2))
    if (d.startsWith('a:') && st.step === 'q' && st.cat) {
      const [, qi, oj] = d.split(':').map(Number)
      const qs = questionsFor(st.cat)
      if (qi !== (st.qi ?? 0) || !qs[qi]?.options[oj]) return // устаревшая кнопка
      const answers = { ...(st.answers ?? {}), [qs[qi].id]: qs[qi].options[oj] }
      if (qi + 1 < qs.length) { await save({ ...st, qi: qi + 1, answers }); return ask(ad, chat, st) }
      await save({ ...st, step: 'city', answers })
      return askCity(ad, chat)
    }
    if (d.startsWith('y:') && st.step === 'city' && getCity(d.slice(2))) {
      st = { ...st, city: d.slice(2) }
      return needPhone(ad, inc, st)
    }
    return
  }

  // --- контакт (номер телефона)
  if (inc.phone) {
    const phone = normalizePhone(inc.phone)
    if (st.step === 'phone' && phone) return finalize(ad, inc, st, phone, !!inc.phoneVerified)
    return
  }

  // --- обычный текст
  const text = (inc.text ?? '').trim()
  if (!text) return
  const low = text.toLowerCase()
  if (['/menu', 'меню', '/new', 'заказать', 'заявка'].includes(low)) { await save({ step: 'idle' }); return menu(ad, chat) }
  if (['/orders', 'заказы', 'мои заказы'].includes(low)) return void (await ad.send(chat, `Ваши заказы и чаты: ${SITE_URL}/orders\nЕсли открываете с другого устройства, войдите по номеру телефона.`))

  if (st.step === 'phone') {
    if (normalizePhone(text) && isPlausiblePhone(text)) return finalize(ad, inc, st, normalizePhone(text)!, false)
    return void (await ad.askPhone(chat, 'Не похоже на номер. Нажмите кнопку или напишите номер, например +7 926 123-45-67.'))
  }
  if (st.step === 'q' || st.step === 'city') return void (await ad.send(chat, 'Выберите вариант кнопкой выше. Чтобы начать заново, напишите «меню».'))

  // сообщение в диалог с компанией: ответом на её сообщение или в последний активный
  const acctId = await chatAccount(ad.ch, chat)
  let convId: string | null = inc.replyTo ? await lookupClientMsg(ad.ch, chat, inc.replyTo) : null
  if (!convId && acctId) {
    const convs = (await accountConvs(acctId)).sort((a, b) => (b.msgs.at(-1)?.at ?? 0) - (a.msgs.at(-1)?.at ?? 0))
    convId = convs[0]?.id ?? null
  }
  const conv = convId ? await getConv(convId) : null
  if (conv) {
    await clientSays(conv, text)
    return void (await ad.send(chat, '✓ Передано. Ответ придёт сюда и в чат на сайте.'))
  }
  return menu(ad, chat, false, true)
}
