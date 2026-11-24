import type { PriceOffer } from '../types'

export function priceLabel(price: PriceOffer) {
  const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
    .format(price.amount_php_minor / 100)
  return price.currency === 'PHP' ? peso : `≈ ${peso}`
}

export function originalPrice(price: PriceOffer) {
  const amount = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(price.source_amount))
  return `${price.currency} ${amount}`
}
