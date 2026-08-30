/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { DEFAULT_DISCOUNT_RATE } from '../constants'

// ============================================================================
// Wallet-specific Formatting Functions
// ============================================================================

/**
 * Format Creem price with currency symbol (USD/EUR)
 */
export function formatCreemPrice(
  price: number,
  currency: 'USD' | 'EUR'
): string {
  const symbol = currency === 'EUR' ? '€' : '$'
  return `${symbol}${price.toFixed(2)}`
}

/**
 * Format large quota numbers with K/M suffix
 */
export function formatQuotaShort(quota: number): string {
  if (quota >= 1000000) {
    return `${(quota / 1000000).toFixed(1)}M`
  }
  if (quota >= 1000) {
    return `${(quota / 1000).toFixed(1)}K`
  }
  return quota.toString()
}

/**
 * Format currency amount that is already in local currency.
 * This is used for payment amounts that have been calculated via priceRatio.
 */
export function formatCurrency(amount: number | string): string {
  const numeric =
    typeof amount === 'number' ? amount : Number.parseFloat(String(amount))
  if (!Number.isFinite(numeric)) return '-'

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(numeric) >= 1 ? 2 : 4,
  }).format(numeric)
}

// ============================================================================
// C2C Topup Unit Conversion (RMB-first display semantics)
// ============================================================================

/**
 * Convert a CNY (¥) figure typed by the user into the integer "topup unit"
 * amount the backend expects.
 *
 * Backend contract (controller/topup.go, DO NOT change lightly):
 * - `/api/user/amount` and `/api/user/pay` take `amount` as an int64 number
 *   of USD quota units (1 unit = 500000 quota = $1). Fractional values are
 *   rejected by JSON binding, so the result MUST be an integer.
 * - The user is charged `amount × Price` in CNY (operation_setting.Price,
 *   7.2 in this deployment — same value as custom_currency_exchange_rate).
 *
 * Because only integer units are accepted, a CNY input is snapped to the
 * NEAREST unit; the exact charge (units × Price) is always shown live via
 * /api/user/amount and in the payment confirm dialog before the user pays.
 *
 * Example: user types ¥10 → Math.round(10 / 7.2) = 1 unit → charged ¥7.2.
 * If the pricing semantics ever change, this file and FALLBACK_CNY_PER_UNIT
 * (constants.ts) are the only places to touch.
 */
export function cnyToTopupUnits(cny: number, cnyPerUnit: number): number {
  if (
    !Number.isFinite(cny) ||
    cny <= 0 ||
    !Number.isFinite(cnyPerUnit) ||
    cnyPerUnit <= 0
  ) {
    return 0
  }
  return Math.round(cny / cnyPerUnit)
}

/**
 * Inverse of {@link cnyToTopupUnits}: convert topup units (USD) back to the
 * CNY figure shown in the custom amount input (units × price-per-unit).
 * Rounded to fen (2 decimals) to hide binary float noise (10 / 7.2 * 7.2).
 */
export function topupUnitsToCny(units: number, cnyPerUnit: number): number {
  if (
    !Number.isFinite(units) ||
    units <= 0 ||
    !Number.isFinite(cnyPerUnit) ||
    cnyPerUnit <= 0
  ) {
    return 0
  }
  return Math.round(units * cnyPerUnit * 100) / 100
}

/**
 * Get discount label for display (e.g., "20% OFF")
 */
export function getDiscountLabel(discount: number): string {
  if (discount >= DEFAULT_DISCOUNT_RATE) {
    return ''
  }
  const off = Math.round((1 - discount) * 100)
  return `${off}% OFF`
}

/**
 * Calculate pricing details for a preset amount
 */
export function calculatePresetPricing(
  presetValue: number,
  priceRatio: number,
  discount: number,
  usdExchangeRate: number = 1
) {
  const originalPrice = presetValue * priceRatio
  const actualPrice = originalPrice * discount
  const savedAmount = originalPrice - actualPrice
  const hasDiscount = discount < 1.0
  const displayValue = presetValue * usdExchangeRate

  return {
    displayValue,
    originalPrice,
    actualPrice,
    savedAmount,
    hasDiscount,
  }
}
