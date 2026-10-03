import type { Metadata } from 'next'
import { RegisterForm } from '@/components/RegisterForm'

export const metadata: Metadata = { title: 'Стать партнёром', description: 'Разместите компанию за минуту: телефон и категория. Заявки приходят в Telegram.', alternates: { canonical: '/partner/register' } }

export default function Page() {
  return (
    <>
      <h1>Стать партнёром</h1>
      <p className="lead">Телефон, категории, район. Всё остальное можно заполнить позже.</p>
      <RegisterForm />
    </>
  )
}
