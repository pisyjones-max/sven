export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Платформа домов'

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
).replace(/\/$/, '')

export const TG_BOT = process.env.NEXT_PUBLIC_TG_BOT ?? ''
