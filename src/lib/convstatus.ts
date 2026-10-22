// В какой список кабинета попадает заявка. Чистая функция: используется и браузером, и тестами.
export type Bucket = 'new' | 'work' | 'closed'
export interface ConvLike { accepted: boolean; complaint: boolean; finished?: boolean; handedTo?: unknown }

export function convBucket(c: ConvLike): Bucket {
  if (c.complaint || c.handedTo || c.finished) return 'closed'
  return c.accepted ? 'work' : 'new'
}
export const BUCKET_TITLE: Record<Bucket, string> = { new: 'Новые', work: 'В работе', closed: 'Закрытые' }
