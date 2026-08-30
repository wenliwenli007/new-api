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

/**
 * Deterministic CNY (¥) formatter for every payable figure on this site.
 *
 * This deployment serves RMB users only, so topup amounts must ALWAYS carry
 * the ¥ prefix. Unlike formatLocalCurrencyAmount (@/lib/currency), this
 * helper reads NO runtime/admin-provided configuration: the previous chain
 * (quota_display_type / custom_currency_symbol delivered by /api/status and
 * cached in the zustand store + localStorage) can be missing, stale or
 * non-CNY — in which case amounts silently degraded to "$", "¤" or a bare
 * number. Topup amounts are CNY-native end to end (backend `amount` IS yuan,
 * 1:1); FALLBACK_CNY_PER_UNIT (constants.ts) now only powers the "estimated
 * credit in USD" hint, this function just renders the ¥ figure.
 */
export function formatCnyAmount(amount: number | string): string {
  const numeric =
    typeof amount === 'number' ? amount : Number.parseFloat(String(amount))
  if (!Number.isFinite(numeric)) return '-'

  // 'zh-CN' is pinned so the decimal separator stays "." regardless of the
  // visitor's browser locale — these are money figures shown before payment.
  return `¥${new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(numeric) >= 1 ? 2 : 4,
  }).format(numeric)}`
}

// ============================================================================
// C2C Topup (CNY-native semantics)
// ============================================================================

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
 * Calculate pricing details for a preset amount (CNY-native).
 *
 * The preset value IS the CNY (¥) price the user pays (1:1 — the backend
 * charges `amount` yuan directly for the ZPAY channel); an optional
 * per-amount discount configured by the admin reduces what the user pays.
 * Figures are rounded to fen (2 decimals) to hide binary float noise
 * (e.g. 50 × 0.9).
 */
export function calculatePresetPricing(presetValue: number, discount: number) {
  const displayValue = presetValue
  const originalPrice = presetValue
  const actualPrice = Math.round(presetValue * discount * 100) / 100
  const savedAmount = Math.round((originalPrice - actualPrice) * 100) / 100
  const hasDiscount = discount < 1.0

  return {
    displayValue,
    originalPrice,
    actualPrice,
    savedAmount,
    hasDiscount,
  }
}
