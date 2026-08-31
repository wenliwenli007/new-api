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

import { api } from '@/lib/http-client'

import { getMockModelDetail, mockMarketListings } from '../mock/market'
import type {
  MarketListFilters,
  MarketListResult,
  ModelDetail,
} from '../types/market'
import type { AddRouteInput, ConsumerRoute } from '../types/route'
import type { CredentialView, ProbeResult } from '../types/credential'
import type {
  CallLogPage,
  EarningSummary,
  HealthSummary,
  RankingItem,
  RankingMetric,
  sharellmMock,
} from '../types/surfaces'

type MockSurface = typeof sharellmMock

// Single data entry point for ShareLLM pages. While USE_MOCK is true every
// call resolves local seed data; switching to the real backend only requires
// flipping the flag — page components keep calling sharellmApi.*.
const USE_MOCK = true

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function nextId(items: { id: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.id), 0) + 1
}

function applyFilters(
  filters: MarketListFilters
): MarketListResult {
  const pageSize = filters.pageSize ?? 10
  const page = filters.page ?? 1
  let items = [...mockMarketListings]

  if (filters.q) {
    const q = filters.q.toLowerCase()
    items = items.filter(
      (l) =>
        l.model.toLowerCase().includes(q) ||
        l.bestOffer.contributor.toLowerCase().includes(q)
    )
  }
  if (filters.brand) {
    items = items.filter((l) => l.vendor === filters.brand)
  }
  if (filters.model) {
    items = items.filter((l) => l.model === filters.model)
  }
  if (filters.freeOnly) {
    items = items.filter((l) => l.tags.includes('Free of charge'))
  }
  switch (filters.sort) {
    case 'latency':
      items.sort((a, b) => parseFloat(a.bestOffer.latency) - parseFloat(b.bestOffer.latency))
      break
    case 'success':
      items.sort((a, b) => parseFloat(b.bestOffer.successRate) - parseFloat(a.bestOffer.successRate))
      break
    case 'price':
      items.sort((a, b) => parseFloat(a.bestOffer.inputPrice.slice(1)) - parseFloat(b.bestOffer.inputPrice.slice(1)))
      break
    default:
      break
  }

  const total = items.length
  items = items.slice((page - 1) * pageSize, page * pageSize)
  return { items, total, page, pageSize }
}

export const sharellmApi = {
  getMarketList(filters: MarketListFilters = {}): Promise<MarketListResult> {
    if (USE_MOCK) return delay(applyFilters(filters))
    return api
      .get('/api/sharellm/market', { params: filters as Record<string, unknown> })
      .then((res) => res.data)
  },

  getModelDetail(modelId: string): Promise<ModelDetail> {
    if (USE_MOCK) return delay(getMockModelDetail(modelId))
    return api.get(`/api/sharellm/market/${modelId}`).then((res) => res.data)
  },

  // ------------------------------------------------------------------
  // Consumer: route center
  // ------------------------------------------------------------------

  getRoutes(): Promise<ConsumerRoute[]> {
    if (USE_MOCK) return delay(sharellmMock.routes.map((r) => ({ ...r })))
    return api.get('/api/sharellm/route-center').then((res) => res.data)
  },

  createRoute(input: AddRouteInput): Promise<ConsumerRoute> {
    if (USE_MOCK) {
      const listing = mockMarketListings.find((l) => l.model === input.model)
      const route: ConsumerRoute = {
        id: nextId(sharellmMock.routes),
        name: input.name,
        status: 'active',
        failover: input.failover,
        tokenId: nextId(sharellmMock.routes) + 100,
        tokenKeyMask: 'sk-****new1',
        items: [
          {
            id: nextId(sharellmMock.routes.flatMap((r) => r.items)),
            listingId: listing?.id ?? 0,
            offerId: input.offerId,
            model: input.model,
            contributor: listing?.bestOffer.contributor ?? '—',
            priority: input.priority,
            weight: 1,
          },
        ],
        createdAt: new Date().toISOString().slice(0, 10),
      }
      sharellmMock.routes.push(route)
      return delay(route)
    }
    return api.post('/api/sharellm/route-center', input).then((res) => res.data)
  },

  deleteRoute(id: number): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      const idx = sharellmMock.routes.findIndex((r) => r.id === id)
      if (idx >= 0) sharellmMock.routes.splice(idx, 1)
      return delay({ success: true })
    }
    return api.delete(`/api/sharellm/route-center/${id}`).then((res) => res.data)
  },

  // ------------------------------------------------------------------
  // Contributor: credentials (masked views only) & earnings
  // ------------------------------------------------------------------

  getCredentials(): Promise<CredentialView[]> {
    if (USE_MOCK) return delay(sharellmMock.credentials.map((c) => ({ ...c })))
    return api.get('/api/sharellm/credentials').then((res) => res.data)
  },

  probeCredential(id: number): Promise<ProbeResult> {
    if (USE_MOCK) {
      const c = sharellmMock.credentials.find((x) => x.id === id)
      return delay({
        credentialId: id,
        successRate: c?.successRate ?? '100%',
        latency: c?.latency ?? '1.20s',
        cacheHitRate: c?.cacheHitRate ?? '—',
        verified: c?.status === 'active',
        probedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      })
    }
    return api
      .post(`/api/sharellm/credentials/${id}/probe`)
      .then((res) => res.data)
  },

  getEarnings(): Promise<EarningSummary> {
    if (USE_MOCK) return delay(sharellmMock.earnings)
    return api.get('/api/sharellm/earnings').then((res) => res.data)
  },

  // ------------------------------------------------------------------
  // Shared surfaces: call logs, health, rankings
  // ------------------------------------------------------------------

  getCallLogs(page = 1, pageSize = 20): Promise<CallLogPage> {
    if (USE_MOCK) {
      return delay({
        items: sharellmMock.callLogs,
        total: sharellmMock.callLogs.length,
        page,
        pageSize,
      })
    }
    return api
      .get('/api/sharellm/call-logs', { params: { page, pageSize } })
      .then((res) => res.data)
  },

  getHealth(): Promise<HealthSummary> {
    if (USE_MOCK) return delay(sharellmMock.health)
    return api.get('/api/sharellm/health').then((res) => res.data)
  },

  getRankings(_metric: RankingMetric = 'calls'): Promise<RankingItem[]> {
    if (USE_MOCK) return delay(sharellmMock.rankings.map((r) => ({ ...r })))
    return api
      .get('/api/sharellm/rankings', { params: { metric: _metric } })
      .then((res) => res.data)
  },
}
