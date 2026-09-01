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

/**
 * useOfficialPricing — 从 /api/status（useStatus 缓存）读取官方基准价快照，
 * 转成 model(小写) → OfficialPricingEntry 索引，供渠道定价节与市场页共用。
 */
import { useMemo } from 'react'

import { useStatus } from '@/hooks/use-status'

import type { OfficialPricingEntry } from '../components/pricing/types'

type StatusLike = {
  official_pricing?: Array<{
    model: string
    price: OfficialPricingEntry
  }>
}

export function useOfficialPricing() {
  const { status, loading } = useStatus()

  const officialPricing = useMemo(() => {
    const raw = (status as StatusLike | undefined)?.official_pricing ?? []
    const map: Record<string, OfficialPricingEntry> = {}
    for (const item of raw) {
      if (item?.model && item?.price && item.price.input > 0) {
        map[item.model.toLowerCase()] = item.price
      }
    }
    return map
  }, [status])

  return { officialPricing, isLoading: loading }
}

/**
 * computeConflictedModels — 同一模型出现在多个启用渠道时，
 * 渠道编辑页应提示冲突（保存只对最高优先级渠道生效）。
 * 返回冲突模型名集合（大小写归一比较）。
 */
export function computeConflictedModels(
  channels: Array<{ id: number; status: number; models: string }>,
  currentChannelId?: number
): Set<string> {
  const owners = new Map<string, number>()
  for (const channel of channels) {
    if (!channel || channel.status !== 1 || channel.id === currentChannelId) continue
    for (const rawName of (channel.models ?? '').split(',')) {
      const name = rawName.trim().toLowerCase()
      if (!name) continue
      owners.set(name, (owners.get(name) ?? 0) + 1)
    }
  }
  const conflicted = new Set<string>()
  for (const [name, count] of owners) {
    if (count > 0) conflicted.add(name)
  }
  return conflicted
}
