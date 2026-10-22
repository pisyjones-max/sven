// Тесты импорта формата парсера. Запуск: npm test
// Реальные 37 карточек с персональными данными в репозиторий не кладём: путь задаётся PARSER_JSON=/путь/к/файлу.json
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { importParserCards } from '../src/lib/yandex-import'
import { mapCard } from '../src/lib/yandex-card'
import { questionsFor, composeRequest } from '../src/lib/questions'
import { convBucket } from '../src/lib/convstatus'
import { smsLeadAlert } from '../src/lib/sms'
import { listPublicPartners, getPartner } from '../src/lib/store'
import { kvGet } from '../src/lib/kv'

const file = process.env.PARSER_JSON
const real: Record<string, unknown>[] | null = file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
const card = (over: Record<string, unknown> = {}) => ({
  source: 'yandex_uslugi', id: 'test-1', worker_id: 'test-1', ydo_worker_id: 'test-1', name: 'Тест Тестов', first_name: 'Тест', last_name: 'Тестов',
  description: 'Описание', rating: 4.5, reviews_count: 3, account_type: 'person', cities: ['Раменское'], specializations: ['Бетонные работы'],
  categories: [{ path: 'remont-i-stroitelstvo/betonnye-raboty', name: 'Бетонные работы' }], profile_url: 'https://uslugi.yandex.ru/profile/x', ...over,
})

test('битые записи не роняют импорт', async () => {
  const bad: unknown[] = [null, 'строка', 42, [], {}, card({ id: undefined, worker_id: undefined, ydo_worker_id: undefined }), card({ id: 'b1', worker_id: 'b1', ydo_worker_id: 'b1', name: '  ', first_name: '', last_name: '' }),
    card({ id: 'b2', worker_id: 'b2', ydo_worker_id: 'b2', categories: [], found_in: [] }),
    card({ id: 'b3', worker_id: 'b3', ydo_worker_id: 'b3', categories: [{ path: 'krasota/manikyur', name: 'Маникюр' }] })]
  const r = await importParserCards([...bad, card({ id: 'ok1', worker_id: 'ok1', ydo_worker_id: 'ok1' })], false)
  assert.equal(r.counts.invalid, 8)
  assert.equal(r.counts.skipped, 1, 'чужая рубрика: пропуск с причиной, не молчаливая потеря')
  assert.equal(r.counts.created, 1)
  assert.match(r.rows[8].note ?? '', /вне каталога/)
})

test('предпросмотр ничего не записывает', async () => {
  const before = (await listPublicPartners()).length
  await importParserCards([card({ id: 'pv', worker_id: 'pv', ydo_worker_id: 'pv' })], false)
  assert.equal((await listPublicPartners()).length, before)
  assert.equal(await kvGet('psrc:yandex_uslugi:pv'), null)
})

test('идемпотентность и слияние без затирания пустым', async () => {
  const c = card({ id: 'idem', worker_id: 'idem', ydo_worker_id: 'idem' })
  const a = await importParserCards([c], true)
  assert.equal(a.counts.created, 1)
  const n1 = (await listPublicPartners()).length
  const b = await importParserCards([c], true)
  assert.equal(b.counts.unchanged, 1)
  assert.equal((await listPublicPartners()).length, n1, 'повторный импорт не создаёт дублей')
  const id = (await kvGet<string>('psrc:yandex_uslugi:idem'))!
  const p0 = await getPartner(id)
  // тот же исполнитель, но часть полей пришла пустой: старое остаётся
  const d = await importParserCards([card({ id: 'idem', worker_id: 'idem', ydo_worker_id: 'idem', description: '', rating: null, reviews_count: 0, specializations: [] })], true)
  assert.equal(d.counts.unchanged, 1)
  const p1 = await getPartner(id)
  assert.equal(p1?.desc, 'Описание'); assert.equal(p1?.ext?.rating, 4.5); assert.deepEqual(p1?.ext?.specs, ['Бетонные работы'])
  // реальное обновление
  const e = await importParserCards([card({ id: 'idem', worker_id: 'idem', ydo_worker_id: 'idem', rating: 5, reviews_count: 4 })], true)
  assert.equal(e.counts.updated, 1)
  const p2 = await getPartner(id)
  assert.equal(p2?.ext?.rating, 5); assert.equal(p2?.slug, p0?.slug, 'slug и токен кабинета не меняются'); assert.equal(p2?.token, p0?.token)
})

test('человек не превращается в компанию, телефон из контактов не уходит в phone', () => {
  const m = mapCard(card({ social_links: [{ whatsapp: '79990000000' }] }))
  assert.ok(m.ok)
  if (m.ok) { assert.equal(m.card.ext.accountType, 'person'); assert.equal(m.card.ext.contacts?.whatsapp, '79990000000') }
})

test('реальные 37 карточек', { skip: real ? false : 'нет PARSER_JSON' }, async () => {
  const cards = real!
  const ids = new Set(cards.map(c => String(c.ydo_worker_id ?? c.worker_id ?? c.id)))
  const before = (await listPublicPartners()).length
  const pre = await importParserCards(cards, false)
  assert.equal(pre.counts.invalid, 0); assert.equal(pre.counts.skipped, 0)
  assert.equal((await listPublicPartners()).length, before, 'предпросмотр не пишет')
  const r1 = await importParserCards(cards, true)
  assert.equal(r1.counts.created, ids.size)
  const after = await listPublicPartners()
  assert.equal(after.length, before + ids.size)
  const r2 = await importParserCards(cards, true)
  assert.equal(r2.counts.created, 0); assert.equal(r2.counts.unchanged, ids.size)
  assert.equal((await listPublicPartners()).length, before + ids.size, 'повтор: дублей нет')
  for (const c of cards.slice(0, 37)) {
    const p = await getPartner((await kvGet<string>(`psrc:yandex_uslugi:${c.ydo_worker_id ?? c.id}`))!)
    assert.ok(p); assert.equal(p.name, String(c.name).trim()); assert.equal(p.city, 'ramenskoe')
    assert.equal(p.ext?.profileUrl, c.profile_url); assert.equal(p.ext?.accountType, c.account_type)
    assert.equal(p.ext?.rating, (c.rating as number) > 0 ? c.rating : undefined)
    assert.deepEqual(p.ext?.specs, [...new Set((c.specializations as string[]) ?? [])].slice(0, 80).length ? [...new Set(c.specializations as string[])].slice(0, 80) : undefined)
    assert.equal(p.imported, true); assert.equal(p.claimed, false); assert.equal(p.phone, '')
  }
})

test('большие работы не спрашивают «сегодня/завтра»', () => {
  for (const c of ['garazh', 'zabor', 'krovlya', 'parkovka-plitka', 'remont-i-stroitelstvo']) {
    const w = questionsFor(c).find(x => x.id === 'when')!
    assert.ok(w && !w.options.includes('Сегодня') && !w.options.includes('Завтра'), c)
  }
  assert.ok(questionsFor('otkachka-septika').find(x => x.id === 'when')!.options.includes('Сегодня'), 'срочные услуги не тронуты')
  const text = composeRequest('Гараж и навес', 'Раменское', 'garazh', { when: 'В следующем году', next: 'Выезд на замер' }, '')
  assert.match(text, /Когда планируете: В следующем году/); assert.match(text, /Выезд на замер/)
})

test('списки кабинета: новые, в работе, закрытые', () => {
  assert.equal(convBucket({ accepted: false, complaint: false }), 'new')
  assert.equal(convBucket({ accepted: true, complaint: false }), 'work')
  assert.equal(convBucket({ accepted: true, complaint: false, finished: true }), 'closed')
  assert.equal(convBucket({ accepted: false, complaint: true }), 'closed')
  assert.equal(convBucket({ accepted: false, complaint: false, handedTo: { name: 'x' } }), 'closed')
})

test('SMS о заявке: выключено по умолчанию, не чаще раза в 10 минут, без телефона не шлём', async () => {
  const p = { id: 'sms-p1', phone: '79990001122', token: 'tok' }
  delete process.env.SMS_LEAD_ALERTS; process.env.SMS_DEV = '1'
  assert.equal(await smsLeadAlert(p, 'Гараж и навес', 'https://x'), 'off')
  process.env.SMS_LEAD_ALERTS = '1'
  assert.equal(await smsLeadAlert({ ...p, phone: '' }, 'Гараж и навес', 'https://x'), 'no_phone')
  assert.equal(await smsLeadAlert(p, 'Гараж и навес', 'https://x'), 'sent')
  assert.equal(await smsLeadAlert(p, 'Гараж и навес', 'https://x'), 'throttled')
})
