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

// ShareLLM marketplace domain types. Single contract source shared by the
// mock adapter and (later) the real /api/sharellm/* client.
export type BillingType = 'token' | 'request' | 'subscription'

export interface MarketOffer {
  id: number
  contributor: string
  inputPrice: string
  cachePrice: string
  outputPrice: string
  multiplier: string
  successRate: string
  latency: string
  cacheHitRate: string
  lastSuccessAt: string
}

export interface MarketListing {
  id: number
  model: string
  vendor?: string
  billingType: BillingType
  tags: string[]
  bestOffer: MarketOffer
  reviewCount: number
  rating?: number
}

export interface MarketListFilters {
  brand?: string
  model?: string
  q?: string
  billing?: BillingType
  freeOnly?: boolean
  sort?: 'price' | 'success' | 'latency' | 'recent'
  page?: number
  pageSize?: number
}

export interface MarketListResult {
  items: MarketListing[]
  total: number
  page: number
  pageSize: number
}

export interface ModelDetail {
  model: string
  vendor?: string
  tags: string[]
  priceNote: string
  offers: MarketOffer[]
  verified: boolean
  lastProbedAt: string
  rating?: number
  reviewCount: number
}
