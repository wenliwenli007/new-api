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

import { clampPage, getPageCount, paginateItems } from '../lib/pagination'

describe('market pagination', () => {
  it('computes page count with at least one page', () => {
    expect(getPageCount(0, 10)).toBe(1)
    expect(getPageCount(6, 10)).toBe(1)
    expect(getPageCount(11, 10)).toBe(2)
    expect(getPageCount(20, 10)).toBe(2)
    expect(getPageCount(21, 10)).toBe(3)
  })

  it('clamps the requested page into the valid range', () => {
    expect(clampPage(0, 3)).toBe(1)
    expect(clampPage(-2, 3)).toBe(1)
    expect(clampPage(2, 3)).toBe(2)
    expect(clampPage(99, 3)).toBe(3)
  })

  it('slices the requested page of models', () => {
    const items = Array.from({ length: 23 }, (_, i) => `model-${i + 1}`)

    expect(paginateItems(items, 1, 10)).toHaveLength(10)
    expect(paginateItems(items, 2, 10)).toHaveLength(10)
    expect(paginateItems(items, 3, 10)).toEqual([
      'model-21',
      'model-22',
      'model-23',
    ])
    expect(paginateItems(items, 3, 10).at(0)).toBe('model-21')
  })

  it('falls back to the last page when filters shrink the list', () => {
    const items = ['a', 'b', 'c']
    expect(paginateItems(items, 5, 10)).toEqual(['a', 'b', 'c'])
  })
})
