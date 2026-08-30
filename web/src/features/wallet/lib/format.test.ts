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
import { describe, expect, test } from 'vitest'

import { FALLBACK_CNY_PER_UNIT } from '../constants'
import {
  cnyToTopupUnits,
  formatCnyAmount,
  topupUnitsToCny,
} from './format'

describe('formatCnyAmount (deterministic RMB display)', () => {
  test('always prefixes ¥ regardless of any runtime configuration', () => {
    // Preset tiers: 1/2/10/20 units × ¥7.2.
    expect(formatCnyAmount(7.2)).toBe('¥7.2')
    expect(formatCnyAmount(14.4)).toBe('¥14.4')
    expect(formatCnyAmount(72)).toBe('¥72')
    expect(formatCnyAmount(144)).toBe('¥144')
  })

  test('keeps a ¥ on zero and fractional amounts', () => {
    expect(formatCnyAmount(0)).toBe('¥0')
    expect(formatCnyAmount(0.5)).toBe('¥0.5')
  })

  test('renders a dash for non-finite input', () => {
    expect(formatCnyAmount(Number.NaN)).toBe('-')
    expect(formatCnyAmount('not-a-number')).toBe('-')
  })
})

describe('CNY ↔ topup unit conversion (backend integer-unit contract)', () => {
  test('CNY below one unit snaps to 0 units (minimum hint case)', () => {
    // The reported bug: typing ¥1 must not look like a payable order.
    expect(cnyToTopupUnits(1, FALLBACK_CNY_PER_UNIT)).toBe(0)
    expect(cnyToTopupUnits(3.59, FALLBACK_CNY_PER_UNIT)).toBe(0)
  })

  test('CNY ≥ the unit price maps to at least 1 unit', () => {
    expect(cnyToTopupUnits(7.2, FALLBACK_CNY_PER_UNIT)).toBe(1)
    expect(cnyToTopupUnits(10, FALLBACK_CNY_PER_UNIT)).toBe(1)
    expect(cnyToTopupUnits(72, FALLBACK_CNY_PER_UNIT)).toBe(10)
  })

  test('units convert back to the exact CNY charge (units × price)', () => {
    expect(topupUnitsToCny(1, FALLBACK_CNY_PER_UNIT)).toBe(7.2)
    expect(topupUnitsToCny(10, FALLBACK_CNY_PER_UNIT)).toBe(72)
    expect(topupUnitsToCny(0, FALLBACK_CNY_PER_UNIT)).toBe(0)
  })
})
