// Яндекс SmartCaptcha. Если ключ сервера не задан, проверка выключена (форма работает как раньше).
export const captchaOn = () => Boolean(process.env.SMARTCAPTCHA_SERVER_KEY)

export async function verifyCaptcha(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.SMARTCAPTCHA_SERVER_KEY
  if (!secret) return true
  const t = String(token ?? '')
  if (!t) return false
  try {
    const r = await fetch('https://smartcaptcha.yandexcloud.net/validate', {
      method: 'POST',
      body: new URLSearchParams({ secret, token: t, ip }),
      signal: AbortSignal.timeout(5000),
    })
    const j = (await r.json()) as { status?: string }
    return j.status === 'ok'
  } catch (e) {
    console.error('[doma] captcha check failed', e)
    return true // сервис капчи недоступен: не теряем заявки, защищает лимит частоты
  }
}
