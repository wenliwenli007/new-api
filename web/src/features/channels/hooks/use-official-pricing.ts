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
