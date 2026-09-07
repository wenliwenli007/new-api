import { useSystemConfigStore } from '@/stores/system-config-store'

import * as React from 'react'

export type DisplayCurrency = 'CNY' | 'USD'

const DISPLAY_CURRENCY_KEY = 'lc-display-currency'

export function getDisplayCurrency(): DisplayCurrency {
  if (typeof window === 'undefined') return 'CNY'
  const stored = window.localStorage.getItem(DISPLAY_CURRENCY_KEY)
  if (stored === 'USD') return 'USD'
  return navigator.language?.toLowerCase().startsWith('zh') ? 'CNY' : 'USD'
}

export function useDisplayCurrency(): DisplayCurrency {
  const [currency, setCurrency] = React.useState<DisplayCurrency>(getDisplayCurrency)
  React.useEffect(() => {
    const handler = (event: Event) => {
      const value = (event as CustomEvent).detail?.currency
      if (value === 'CNY' || value === 'USD') setCurrency(value)
    }
    window.addEventListener('display-currency-change', handler)
    return () => window.removeEventListener('display-currency-change', handler)
  }, [])
  return currency
}

export function getDisplayExchangeRate(): number {
  const rate = useSystemConfigStore.getState().config.currency.customCurrencyExchangeRate
  return Number.isFinite(rate) && rate > 0 ? rate : 7.2
}

export function formatDisplayAmount(
  cny: number,
  currency: DisplayCurrency,
  displayExchangeRate = getDisplayExchangeRate(),
  digits = 4
): string {
  const amount = currency === 'USD' ? cny / displayExchangeRate : cny
  const symbol = currency === 'USD' ? '$' : '¥'
  return `${symbol}${amount.toFixed(amount > 0 && amount < 0.01 ? 6 : digits)}`
}

type OfficialPriceLike = {
  input: number
  output: number
  region?: string
}

export function getOfficialPriceCny(
  official: OfficialPriceLike,
  displayExchangeRate: number
) {
  const international = official.region?.toLowerCase() !== 'domestic'
  return {
    input: international ? official.input * displayExchangeRate : official.input,
    output: international ? official.output * displayExchangeRate : official.output,
  }
}

export { DISPLAY_CURRENCY_KEY }
