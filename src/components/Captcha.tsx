'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Яндекс SmartCaptcha. Без NEXT_PUBLIC_SMARTCAPTCHA_SITEKEY ничего не показывает, формы работают как раньше.
const SITEKEY = process.env.NEXT_PUBLIC_SMARTCAPTCHA_SITEKEY ?? ''

interface SC { render: (el: HTMLElement, p: { sitekey: string; hl?: string; callback?: (t: string) => void }) => number }
type W = typeof window & { smartCaptcha?: SC }

function loadScript() {
  if (document.getElementById('smartcaptcha-js')) return
  const s = document.createElement('script')
  s.id = 'smartcaptcha-js'
  s.src = 'https://smartcaptcha.yandexcloud.net/captcha.js'
  s.async = true
  document.head.appendChild(s)
}

function CaptchaBox({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    loadScript()
    let tries = 0
    const t = setInterval(() => {
      const sc = (window as W).smartCaptcha
      if (sc && ref.current) {
        clearInterval(t)
        if (!ref.current.childElementCount) sc.render(ref.current, { sitekey: SITEKEY, hl: 'ru', callback: onToken })
      } else if (++tries > 100) clearInterval(t)
    }, 100)
    return () => clearInterval(t)
  }, [onToken])
  return <div ref={ref} className="captcha" />
}

// Хук для форм: token отправляем в теле запроса, reset вызываем после любой ошибки (токен одноразовый)
export function useCaptcha() {
  const [token, setToken] = useState('')
  const [n, setN] = useState(0)
  const reset = useCallback(() => { setToken(''); setN(x => x + 1) }, [])
  const widget = SITEKEY ? <CaptchaBox key={n} onToken={setToken} /> : null
  return { token, widget, reset, enabled: Boolean(SITEKEY) }
}
