// Телефоны и ссылки в переписке скрываются, пока партнёр не принял заявку:
// иначе платформа теряет комиссию за лид.
const PHONE_RE = /(?:\+?\d[\s\-().]{0,2}){10,}/g
const LINK_RE = /(?:https?:\/\/|t\.me\/|wa\.me\/|@[a-z0-9_]{4,})\S*/gi

export function maskContacts(text: string): string {
  return text.replace(PHONE_RE, '[номер скрыт]').replace(LINK_RE, '[контакт скрыт]')
}
