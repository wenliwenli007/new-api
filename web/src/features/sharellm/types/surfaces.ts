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

import type { CredentialView, ProbeResult } from './credential'
import type { ConsumerRoute } from './route'

// Consumer/contributor side surfaces: call logs, earnings, health, rankings.
export interface CallLog {
  id: number
  time: string
  model: string
  routeName?: string
  credentialName?: string
  tokens: string
  status: 'success' | 'failed'
  latency?: string
  consumerCost?: string
  contributorEarning?: string
}

export interface CallLogPage {
  items: CallLog[]
  total: number
  page: number
  pageSize: number
}

export interface EarningEntry {
  date: string
  model: string
  calls: number
  gross: string
  platformFee: string
  net: string
}

export interface SettlementBatch {
  id: string
  amount: string
  platformFee: string
  netPayout: string
  maturityAt: string
  status: 'pending' | 'settled' | 'withdrawn'
}

export interface EarningSummary {
  total: string
  pending: string
  withdrawn: string
  entries: EarningEntry[]
  batches: SettlementBatch[]
}

export interface HealthChannel {
  name: string
  status: 'ok' | 'warn' | 'bad'
  successRate: string
  latency: string
}

export interface HealthSummary {
  overallSuccess: string
  yesterdayCalls: string
  patrol: string
  channels: HealthChannel[]
}

export type RankingMetric = 'calls' | 'success' | 'latency' | 'cache_hit'

export interface RankingItem {
  rank: number
  model: string
  calls: string
  successRate: string
  latency: string
  cacheHitRate: string
}

// Aggregated mock surface the client adapter resolves from.
export const sharellmMock = {
  routes: [
    {
      id: 1,
      name: 'my-route-1',
      status: 'active' as const,
      failover: true,
      tokenId: 101,
      tokenKeyMask: 'sk-****k3y1',
      items: [
        { id: 1, listingId: 1, offerId: 11, model: 'deepseek-v4-flash', contributor: 'taohao · 免费自取', priority: 1, weight: 1 },
        { id: 2, listingId: 3, offerId: 13, model: 'gpt-5.6-luna', contributor: 'denni · gpt-重置福利', priority: 2, weight: 1 },
      ],
      lastCallAt: '2 minutes ago',
      createdAt: '2026-08-30',
    },
    {
      id: 2,
      name: 'cheap-fast',
      status: 'active' as const,
      failover: true,
      tokenId: 102,
      tokenKeyMask: 'sk-****k3y2',
      items: [
        { id: 3, listingId: 5, offerId: 15, model: 'gpt-5.4-mini', contributor: '天辛 · sharedchat', priority: 1, weight: 1 },
      ],
      lastCallAt: '1 hours ago',
      createdAt: '2026-08-31',
    },
    {
      id: 3,
      name: 'grok-only',
      status: 'paused' as const,
      failover: false,
      items: [
        { id: 4, listingId: 6, offerId: 16, model: 'grok-4.5', contributor: 'denni · grok-free福利', priority: 1, weight: 1 },
      ],
      lastCallAt: '3 hours ago',
      createdAt: '2026-08-29',
    },
  ] satisfies ConsumerRoute[],

  callLogs: [
    { id: 1, time: '2026-09-01 10:32', model: 'deepseek-v4-flash', routeName: 'my-route-1', tokens: '12.4K', status: 'success' as const, latency: '12.10s', consumerCost: '¥0.00' },
    { id: 2, time: '2026-09-01 10:28', model: 'gpt-5.6-luna', routeName: 'my-route-1', tokens: '8.2K', status: 'success' as const, latency: '1.2s', consumerCost: '¥0.14' },
    { id: 3, time: '2026-09-01 09:50', model: 'gpt-5.4-mini', routeName: 'cheap-fast', tokens: '3.1K', status: 'success' as const, latency: '0.79s', consumerCost: '¥0.07' },
    { id: 4, time: '2026-09-01 09:12', model: 'grok-4.5', routeName: 'grok-only', tokens: '5.6K', status: 'failed' as const, consumerCost: '¥0.00' },
  ] satisfies CallLog[],

  credentials: [
    {
      id: 1,
      name: 'my-openai-key',
      providerType: 'api_key' as const,
      providerName: 'OpenAI',
      keyMask: 'sk-****a1b2',
      status: 'active' as const,
      models: ['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.4-mini', 'gpt-5.4'],
      successRate: '100%',
      latency: '19.18s',
      cacheHitRate: '70.2%',
      lastCallAt: '1 hours ago',
      createdAt: '2026-08-28',
    },
    {
      id: 2,
      name: 'codex-pool',
      providerType: 'codex' as const,
      providerName: 'OpenAI Codex',
      keyMask: 'cx-****9f3e',
      status: 'active' as const,
      models: ['codex-auto-review'],
      successRate: '98.4%',
      latency: '2.03s',
      lastCallAt: '2 hours ago',
      createdAt: '2026-08-29',
    },
    {
      id: 3,
      name: 'gemini-cred',
      providerType: 'gemini' as const,
      providerName: 'Google',
      keyMask: 'AI****c7d8',
      status: 'paused' as const,
      models: ['gemini-3-pro'],
      successRate: '95.0%',
      lastCallAt: '5 hours ago',
      createdAt: '2026-08-30',
    },
    {
      id: 4,
      name: 'grok-key',
      providerType: 'grok' as const,
      providerName: 'xAI',
      keyMask: 'xai****0001',
      status: 'revoked' as const,
      models: ['grok-4.5'],
      lastCallAt: '3 days ago',
      createdAt: '2026-08-27',
    },
  ] satisfies CredentialView[],

  earnings: {
    total: '¥1234.56',
    pending: '¥120.00',
    withdrawn: '¥1000.00',
    entries: [
      { date: '2026-09-01', model: 'gpt-5.6-luna', calls: 142, gross: '¥19.88', platformFee: '¥1.59', net: '¥18.29' },
      { date: '2026-08-31', model: 'deepseek-v4-flash', calls: 88, gross: '¥0.00', platformFee: '¥0.00', net: '¥0.00' },
    ],
    batches: [
      { id: 'SET-202609-01', amount: '¥120.00', platformFee: '¥9.60', netPayout: '¥110.40', maturityAt: '2026-09-08', status: 'pending' as const },
      { id: 'SET-202608-25', amount: '¥980.00', platformFee: '¥78.40', netPayout: '¥901.60', maturityAt: '2026-09-01', status: 'settled' as const },
    ],
  } satisfies EarningSummary,

  health: {
    overallSuccess: '99.8%',
    yesterdayCalls: '16.4K',
    patrol: '24/7',
    channels: [
      { name: 'taohao · 免费自取', status: 'ok' as const, successRate: '100%', latency: '12s' },
      { name: 'denni · sharedchat', status: 'ok' as const, successRate: '100%', latency: '3s' },
      { name: '天辛 · sharedchat', status: 'warn' as const, successRate: '98%', latency: '19s' },
      { name: '佬友 · plus-luna', status: 'ok' as const, successRate: '100%', latency: '14s' },
    ],
  } satisfies HealthSummary,

  rankings: [
    { rank: 1, model: 'gpt-5.6-luna', calls: '8.2K', successRate: '100%', latency: '13s', cacheHitRate: '70%' },
    { rank: 2, model: 'deepseek-v4-flash', calls: '6.1K', successRate: '100%', latency: '12s', cacheHitRate: '20%' },
    { rank: 3, model: 'gpt-5.4-mini', calls: '4.4K', successRate: '100%', latency: '0.8s', cacheHitRate: '0%' },
    { rank: 4, model: 'grok-4.5', calls: '2.9K', successRate: '100%', latency: '7.7s', cacheHitRate: '0%' },
    { rank: 5, model: 'qwen3.7-max', calls: '2.1K', successRate: '100%', latency: '14s', cacheHitRate: '61%' },
  ] satisfies RankingItem[],
}

export type { ProbeResult }
