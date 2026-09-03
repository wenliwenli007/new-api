/*
Copyright (C) 2026 LLM Commons contributors

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
*/

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  FilterChip,
  SuccessBars,
  getDisplayCurrency,
  setDisplayCurrency,
  CURRENCY_KEY,
} from '../v2-widgets'
import { ReferenceSystemCard, MetricBar, KVRow } from '../v2-reference'

describe('FilterChip', () => {
  it('renders title and subtitle', () => {
    render(
      <FilterChip title='DeepSeek' subtitle='3 个模型'>
        test
      </FilterChip>
    )
    expect(screen.getByText('DeepSeek')).toBeInTheDocument()
    expect(screen.getByText('3 个模型')).toBeInTheDocument()
  })

  it('reflects active state via aria-pressed', () => {
    render(<FilterChip title='GLM' active />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('is disabled when passed disabled', () => {
    render(<FilterChip title='X' disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('SuccessBars', () => {
  it('renders correct bar count and percentage', () => {
    const { container } = render(
      <SuccessBars bars={[true, false, true]} percentage='99.5%' />
    )
    const bars = container.querySelectorAll('i')
    expect(bars).toHaveLength(3)
    expect(bars[0]).toHaveClass('bg-success')
    expect(bars[1]).not.toHaveClass('bg-success')
    expect(screen.getByText('99.5%')).toBeInTheDocument()
  })

  it('has accessible label', () => {
    render(
      <SuccessBars bars={[true]} label='7d' percentage='100%' />
    )
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      '7d 100%'
    )
  })
})

describe('getDisplayCurrency / setDisplayCurrency', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to CNY for zh locale', () => {
    vi.stubGlobal('navigator', { language: 'zh-CN' })
    expect(getDisplayCurrency()).toBe('CNY')
    vi.unstubAllGlobals()
  })

  it('defaults to USD for en locale', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    expect(getDisplayCurrency()).toBe('USD')
    vi.unstubAllGlobals()
  })

  it('setDisplayCurrency persists and dispatches event', () => {
    const handler = vi.fn()
    window.addEventListener('display-currency-change', handler)
    setDisplayCurrency('USD')
    expect(localStorage.getItem(CURRENCY_KEY)).toBe('USD')
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener('display-currency-change', handler)
  })
})

describe('ReferenceSystemCard', () => {
  it('renders domestic card with correct region attribute', () => {
    const { container } = render(
      <ReferenceSystemCard
        region='domestic'
        title='中国价镜'
        description='国内官网人民币价'
        icon='¥'
      />
    )
    const card = container.querySelector('[data-slot="reference-system-card"]')
    expect(card).toHaveAttribute('data-region', 'domestic')
    expect(screen.getByText('中国价镜')).toBeInTheDocument()
  })
})

describe('MetricBar', () => {
  it('renders label and value', () => {
    render(
      <MetricBar label='24h' bars={[true, true, false]} value='99.8%' />
    )
    expect(screen.getByText('24h')).toBeInTheDocument()
    expect(screen.getByText('99.8%')).toBeInTheDocument()
  })
})

describe('KVRow', () => {
  it('renders key-value pair', () => {
    render(<KVRow k='输入' v='¥3.0' />)
    expect(screen.getByText('输入')).toBeInTheDocument()
    expect(screen.getByText('¥3.0')).toBeInTheDocument()
  })

  it('applies highlight class when highlight=true', () => {
    const { container } = render(<KVRow k='本站' v='¥5.4' highlight />)
    const value = container.querySelector('span.font-semibold')
    expect(value).toHaveClass('text-primary')
  })
})
