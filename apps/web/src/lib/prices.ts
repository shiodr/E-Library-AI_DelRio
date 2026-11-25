import type { PriceOffer } from '../types'

const pesos = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const publisherAmount = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

export function priceLabel(price: PriceOffer) {
  const peso = pesos.format(price.amount_php_minor / 100)
  return price.currency === 'PHP' ? peso : `≈ ${peso}`
}

export function originalPrice(price: PriceOffer) {
  const amount = publisherAmount.format(Number(price.source_amount))
  return `${price.currency} ${amount}`
}
