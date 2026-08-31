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

import type { MarketListing, ModelDetail } from '../types/market'

// Prototype seed data. Values mirror the verified ShareLLM market structure
// (see docs/sharellm-v1/01-需求规格说明书.md FR-1). Swapping to the real API
// only requires replacing the adapter in ../api/client.ts.
const offer = (
  id: number,
  contributor: string,
  inputPrice: string,
  cachePrice: string,
  outputPrice: string,
  multiplier: string,
  successRate: string,
  latency: string,
  cacheHitRate: string,
  lastSuccessAt: string
) => ({
  id,
  contributor,
  inputPrice,
  cachePrice,
  outputPrice,
  multiplier,
  successRate,
  latency,
  cacheHitRate,
  lastSuccessAt,
})

export const mockMarketListings: MarketListing[] = [
  {
    id: 1,
    model: 'deepseek-v4-flash',
    vendor: 'DeepSeek',
    billingType: 'token',
    tags: ['Free of charge', 'Fast', 'High Quality'],
    bestOffer: offer(11, 'taohao · 免费自取', '¥0.0000', '¥0.0000', '¥0.0000', '0.000×', '100.0%', '12.10s', '20.0%', '26 minutes ago'),
    reviewCount: 0,
  },
  {
    id: 2,
    model: 'deepseek-v4-pro',
    vendor: 'DeepSeek',
    billingType: 'token',
    tags: ['Free of charge', 'High Quality'],
    bestOffer: offer(12, 'taohao · 免费自取', '¥0.0000', '¥0.0000', '¥0.0000', '0.000×', '100.0%', '26.28s', '24.7%', '25 minutes ago'),
    reviewCount: 0,
  },
  {
    id: 3,
    model: 'gpt-5.6-luna',
    vendor: 'OpenAI',
    billingType: 'token',
    tags: ['Low Price', 'Fast', 'High Quality'],
    bestOffer: offer(13, 'denni · gpt-重置福利', '¥0.0140', '¥0.0014', '¥0.0840', '0.070×', '100.0%', '19.18s', '70.2%', '1 hours ago'),
    reviewCount: 12,
    rating: 4.8,
  },
  {
    id: 4,
    model: 'gpt-5.6-terra',
    vendor: 'OpenAI',
    billingType: 'token',
    tags: ['Low Price', 'High Quality'],
    bestOffer: offer(14, '天辛 · sharedchat', '¥0.1800', '¥0.0180', '¥1.0800', '0.090×', '100.0%', '1.76s', '0.0%', '1 hours ago'),
    reviewCount: 3,
    rating: 4.5,
  },
  {
    id: 5,
    model: 'gpt-5.4-mini',
    vendor: 'OpenAI',
    billingType: 'token',
    tags: ['Low Price'],
    bestOffer: offer(15, '天辛 · sharedchat', '¥0.0675', '¥0.0000', '¥0.4050', '0.090×', '100.0%', '0.79s', '0.0%', '15 hours ago'),
    reviewCount: 0,
  },
  {
    id: 6,
    model: 'grok-4.5',
    vendor: 'xAI',
    billingType: 'token',
    tags: ['Low Price'],
    bestOffer: offer(16, 'denni · grok-free福利', '¥0.0800', '¥0.0012', '¥0.0240', '0.004×', '100.0%', '7.67s', '0.0%', '2 hours ago'),
    reviewCount: 1,
    rating: 4.0,
  },
  {
    id: 7,
    model: 'qwen3.7-max',
    vendor: 'Alibaba',
    billingType: 'token',
    tags: ['Free of charge', 'High Quality'],
    bestOffer: offer(17, 'taohao · 免费自取', '¥0.0000', '¥0.0000', '¥0.0000', '0.000×', '100.0%', '14.66s', '60.9%', '9 minutes ago'),
    reviewCount: 0,
  },
  {
    id: 8,
    model: 'codex-auto-review',
    vendor: 'OpenAI',
    billingType: 'request',
    tags: ['Low Price'],
    bestOffer: offer(18, '天辛 · sharedchat', '¥0.1350', '—', '¥0.5400', '0.090×', '100.0%', '2.03s', '—', '18 hours ago'),
    reviewCount: 0,
  },
]

export const mockModelDetails: Record<string, ModelDetail> = {
  'gpt-5.6-luna': {
    model: 'gpt-5.6-luna',
    vendor: 'OpenAI',
    tags: ['Low Price', 'Fast', 'High Quality'],
    priceNote: '元/百万 tokens；倍率为官方价折扣系数',
    verified: true,
    lastProbedAt: '2026-09-01 09:15',
    rating: 4.8,
    reviewCount: 12,
    offers: [
      offer(13, 'denni · gpt-重置福利', '¥0.0140', '¥0.0014', '¥0.0840', '0.070×', '100.0%', '19.18s', '70.2%', '1 hours ago'),
      offer(21, '天辛 · sharedchat', '¥0.0180', '¥0.0018', '¥0.1080', '0.090×', '100.0%', '3.44s', '0.0%', '3 hours ago'),
      offer(22, '佬友友情赞助集合 · plus-luna', '¥0.1000', '¥0.0100', '¥0.6000', '0.500×', '100.0%', '13.64s', '79.8%', '32 minutes ago'),
    ],
  },
  'deepseek-v4-flash': {
    model: 'deepseek-v4-flash',
    vendor: 'DeepSeek',
    tags: ['Free of charge', 'Fast', 'High Quality'],
    priceNote: '元/百万 tokens；免费自取额度由贡献者赞助',
    verified: true,
    lastProbedAt: '2026-09-01 08:40',
    rating: undefined,
    reviewCount: 0,
    offers: [
      offer(11, 'taohao · 免费自取', '¥0.0000', '¥0.0000', '¥0.0000', '0.000×', '100.0%', '12.10s', '20.0%', '26 minutes ago'),
      offer(23, 'denni · apiarc', '¥0.2000', '—', '¥1.2000', '1.000×', '100.0%', '1.14s', '—', 'Just now'),
    ],
  },
}

export function getMockModelDetail(model: string): ModelDetail {
  return (
    mockModelDetails[model] ?? {
      model,
      tags: mockMarketListings.find((l) => l.model === model)?.tags ?? [],
      priceNote: '元/百万 tokens',
      verified: false,
      lastProbedAt: '—',
      reviewCount: 0,
      offers: mockMarketListings.find((l) => l.model === model)
        ? [mockMarketListings.find((l) => l.model === model)!.bestOffer]
        : [],
    }
  )
}
