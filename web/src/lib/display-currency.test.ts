import { describe, expect, it } from 'vitest'

import {
  formatDisplayAmount,
  getOfficialPriceCny,
} from '@/lib/display-currency'

describe('canonical display currency', () => {
  it('converts canonical CNY site price to USD without changing the source price', () => {
    expect(formatDisplayAmount(25, 'CNY', 7.2)).toBe('¥25.0000')
    expect(formatDisplayAmount(25, 'USD', 7.2)).toBe('$3.4722')
  })

  it('keeps domestic official prices in CNY and converts them only for USD display', () => {
    expect(getOfficialPriceCny({ input: 20, output: 100, region: 'domestic' }, 7.2)).toEqual({
      input: 20,
      output: 100,
    })
  })

  it('converts international official USD prices into canonical CNY', () => {
    expect(getOfficialPriceCny({ input: 5, output: 25, region: 'international' }, 7.2)).toEqual({
      input: 36,
      output: 180,
    })
  })
})
