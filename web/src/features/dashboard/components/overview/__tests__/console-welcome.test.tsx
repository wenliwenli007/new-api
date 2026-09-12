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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getUserQuotaDates } from '@/features/dashboard/api'
import { getApiKeys } from '@/features/keys/api'
import { getUserLogs } from '@/features/usage-logs/api'
import { getUserModels } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { ConsoleWelcome } from '../console-welcome'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router'
  )
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  }
})

vi.mock('@/features/keys/api', () => ({ getApiKeys: vi.fn() }))
vi.mock('@/features/dashboard/api', () => ({ getUserQuotaDates: vi.fn() }))
vi.mock('@/features/usage-logs/api', () => ({ getUserLogs: vi.fn() }))
vi.mock('@/lib/api', () => ({ getUserModels: vi.fn() }))

function renderWelcome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ConsoleWelcome />
    </QueryClientProvider>
  )
}

describe('ConsoleWelcome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().auth.setUser({
      id: 1,
      username: 'founder',
      role: 1,
      quota: 500000,
      used_quota: 0,
      request_count: 0,
    })
    vi.mocked(getApiKeys).mockResolvedValue({
      success: true,
      data: { items: [], total: 2 },
    } as never)
    vi.mocked(getUserQuotaDates).mockResolvedValue({
      success: true,
      data: [
        { quota: 1000, count: 3, token_used: 500, created_at: 1 },
        { quota: 2000, count: 4, token_used: 700, created_at: 2 },
      ],
    } as never)
    vi.mocked(getUserLogs).mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 7,
            created_at: 1_700_000_000,
            type: 2,
            model_name: 'deepseek-v4-flash',
            quota: 3000,
            prompt_tokens: 800,
            completion_tokens: 300,
          },
        ],
        total: 1,
      },
    } as never)
    vi.mocked(getUserModels).mockResolvedValue({
      success: true,
      data: ['deepseek-v4-flash'],
    } as never)
  })

  it('renders the four stat cards', async () => {
    renderWelcome()

    expect(screen.getByText('本月调用次数')).toBeInTheDocument()
    expect(screen.getByText('当前余额')).toBeInTheDocument()
    expect(screen.getByText('本月消费')).toBeInTheDocument()
    expect(screen.getByText('可用令牌')).toBeInTheDocument()

    await waitFor(() => {
      // 当月 count 聚合 3 + 4 = 7
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })

  it('renders recent calls from the real per-request log endpoint', async () => {
    renderWelcome()

    await waitFor(() => {
      expect(screen.getByText('deepseek-v4-flash')).toBeInTheDocument()
    })
    // 逐条日志：一行 = 一次调用；tokens = prompt + completion
    expect(screen.getByText('1,100')).toBeInTheDocument()
    expect(vi.mocked(getUserLogs)).toHaveBeenCalledWith(
      expect.objectContaining({ page_size: 5, type: 2 })
    )
  })

  it('shows an empty state instead of fake rows when no calls exist', async () => {
    vi.mocked(getUserLogs).mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    } as never)

    renderWelcome()

    await waitFor(() => {
      expect(screen.getByText('暂无调用记录')).toBeInTheDocument()
    })
  })

  it('renders the JS quick-connect snippet with the site base URL', async () => {
    renderWelcome()

    await waitFor(() => {
      expect(
        screen.getByText(/baseURL: 'http:\/\/localhost:3000\/v1'/)
      ).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText(/model: 'deepseek-v4-flash'/)).toBeInTheDocument()
    })
  })
})
