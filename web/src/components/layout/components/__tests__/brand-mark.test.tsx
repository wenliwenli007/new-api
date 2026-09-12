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
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BrandMark } from '../brand-mark'

describe('BrandMark', () => {
  it('renders a stable loading state', () => {
    const { container } = render(
      <BrandMark src='/brand.svg' name='LLM Commons' loading />
    )

    expect(container.querySelector('[data-slot="brand-mark"]')).toHaveAttribute(
      'data-state',
      'loading'
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the configured logo after preload completes', () => {
    render(
      <BrandMark
        src='/brand.svg'
        name='LLM Commons'
        logoLoaded
        variant='header'
      />
    )

    expect(screen.getByRole('img', { name: 'LLM Commons' })).toHaveClass(
      'opacity-100'
    )
  })

  it('falls back to product initials when the logo fails', () => {
    render(<BrandMark src='/broken.svg' name='LLM Commons' logoLoaded />)

    fireEvent.error(screen.getByRole('img', { name: 'LLM Commons' }))

    expect(screen.getByRole('img', { name: 'LLM Commons' })).toHaveTextContent(
      'LC'
    )
    expect(screen.getByRole('img', { name: 'LLM Commons' })).toHaveAttribute(
      'data-state',
      'fallback'
    )
  })

  it('retries when the configured logo URL changes', () => {
    const view = render(
      <BrandMark src='/broken.svg' name='LLM Commons' logoLoaded />
    )
    fireEvent.error(screen.getByRole('img', { name: 'LLM Commons' }))

    view.rerender(
      <BrandMark src='/replacement.svg' name='LLM Commons' logoLoaded />
    )

    expect(screen.getByRole('img', { name: 'LLM Commons' })).toHaveAttribute(
      'src',
      '/replacement.svg'
    )
  })
})
