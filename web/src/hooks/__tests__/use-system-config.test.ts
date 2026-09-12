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
import { describe, expect, it } from 'vitest'

import { mapStatusDataToConfig } from '@/hooks/use-system-config'
import { DEFAULT_LOGO, DEFAULT_SYSTEM_NAME } from '@/lib/constants'
import { DEFAULT_CURRENCY_CONFIG } from '@/stores/system-config-store'

describe('mapStatusDataToConfig', () => {
  it('preserves configured brand values from status', () => {
    const config = mapStatusDataToConfig({
      system_name: 'LLM Commons',
      logo: 'https://cdn.example.com/brand.svg',
    })

    expect(config.systemName).toBe('LLM Commons')
    expect(config.logo).toBe('https://cdn.example.com/brand.svg')
  })

  it('uses safe defaults only when status omits brand values', () => {
    const config = mapStatusDataToConfig({
      system_name: '',
      logo: '',
    })

    expect(config.systemName).toBe(DEFAULT_SYSTEM_NAME)
    expect(config.logo).toBe(DEFAULT_LOGO)
  })

  it('returns no overrides when status data is unavailable', () => {
    expect(mapStatusDataToConfig(undefined)).toEqual({})
  })

  it('keeps currency fallback behavior unchanged', () => {
    const config = mapStatusDataToConfig({
      quota_per_unit: Number.NaN,
      usd_exchange_rate: 'invalid' as unknown as number,
      custom_currency_symbol: '   ',
    })

    expect(config.currency).toEqual(DEFAULT_CURRENCY_CONFIG)
  })
})
