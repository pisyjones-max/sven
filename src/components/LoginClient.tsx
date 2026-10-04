'use client'
import { SmsCodeForm } from './SmsCodeForm'

export function LoginClient() {
  return <SmsCodeForm cta="Войти" onDone={() => { window.location.href = '/orders' }} />
}
