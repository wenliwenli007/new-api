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

import { formatCnyAmount } from './format'

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
