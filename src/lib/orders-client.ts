// «Мои заказы» без регистрации: ссылки на диалоги клиента хранятся в браузере.
export const ORDERS_KEY = 'doma-orders'
export interface OrderRef { id: string; slug: string }

export function getOrders(): OrderRef[] {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]') as OrderRef[] } catch { return [] }
}

export function addOrder(ref: OrderRef) {
  try {
    const list = getOrders().filter(o => o.id !== ref.id)
    list.unshift(ref)
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 50)))
    window.dispatchEvent(new Event('doma-orders'))
  } catch { /* хранилище недоступно */ }
}
