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
 * channel-pricing-writeback — 渠道价格保存时的写回器（需求 B）。
 *
 * 渠道编辑页保存后调用 applyChannelPricing：
 *  1. 渠道内每模型四价（¥/1M 或按次 ¥）→ USD/1M；
 *  2. 反算全局倍率表三元组：
 *       ModelRatio      = inputUsd / 2
 *       CompletionRatio = outputUsd / inputUsd
 *       CacheRatio      = cachedInputUsd / inputUsd
 *       CreateCacheRatio = cacheWriteUsd / inputUsd
 *  3. 按 Token 模式合入 ModelRatio/CompletionRatio/CacheRatio/CreateCacheRatio；
 *     按次模式直接写 ModelPrice（USD/次，>0 时计费优先于倍率）；
 *  4. 通过管理端 option 接口一次提交（服务端 handleConfigUpdate 落库+广播）。
 *
 * 多渠道冲突策略：调用方按「当前最高优先级启用渠道优先」过滤后传入，
 * 本模块不做渠道仲裁（渠道优先级在服务端路由层，前端无法准确复制）。
 */
import { toast } from 'sonner'

import { api } from '@/lib/api'

import type { ChannelModelPricing, PricingMode } from '../components/pricing/channel-pricing-section'

export type WritebackPlan = {
  modelRatio: Record<string, number>
  completionRatio: Record<string, number>
  cacheRatio: Record<string, number>
  createCacheRatio: Record<string, number>
  modelPrice: Record<string, number>
}

/** 解析 options 表的倍率 JSON（空/非法返回空对象，防保存时误清全表）。 */
export function parseRatioRecord(raw: unknown): Record<string, number> {
  if (typeof raw !== 'string' || raw.trim() === '') return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, number> = {}
    for (const [model, value] of Object.entries(parsed as Record<string, unknown>)) {
      const num = Number(value)
      if (model && Number.isFinite(num)) {
        out[model] = num
      }
    }
    return out
  } catch {
    return {}
  }
}

function emptyPlan(): WritebackPlan {
  return {
    modelRatio: {},
    completionRatio: {},
    cacheRatio: {},
    createCacheRatio: {},
    modelPrice: {},
  }
}

/** 汇率兜底：未配置时按 1（仅管理员可见的换算预览场景）。 */
function safeRate(rate: number | undefined): number {
  return Number.isFinite(rate) && (rate ?? 0) > 0 ? (rate as number) : 1
}

/** 把渠道级定价集合换算为全局倍率表写回计划；无效输入模型被跳过。 */
export function buildWritebackPlan(
  pricing: Record<string, ChannelModelPricing>,
  modes: Record<string, PricingMode>,
  usdExchangeRate: number | undefined
): WritebackPlan {
  const rate = safeRate(usdExchangeRate)
  const plan = emptyPlan()

  for (const [model, entry] of Object.entries(pricing)) {
    if (!model || !entry) continue
    const mode = modes[model] ?? 'token'
    const cnyToUsd = (v: number | null) =>
      v != null && Number.isFinite(v) && v > 0 ? Number(((v / rate).toFixed(6))) : null

    if (mode === 'perCall') {
      const perCallUsd = cnyToUsd(entry.input)
      if (perCallUsd != null) plan.modelPrice[model] = perCallUsd
      continue
    }

    const inputUsd = cnyToUsd(entry.input)
    if (inputUsd == null || inputUsd <= 0) continue
    const outputUsd = cnyToUsd(entry.output)
    const cachedUsd = cnyToUsd(entry.cachedInput)
    const cacheWriteUsd = cnyToUsd(entry.cacheWrite)

    plan.modelRatio[model] = Number((inputUsd / 2).toFixed(6))
    if (outputUsd != null && outputUsd > 0) {
      plan.completionRatio[model] = Number((outputUsd / inputUsd).toFixed(6))
    }
    if (cachedUsd != null && cachedUsd > 0) {
      plan.cacheRatio[model] = Number((cachedUsd / inputUsd).toFixed(6))
    }
    if (cacheWriteUsd != null && cacheWriteUsd > 0) {
      plan.createCacheRatio[model] = Number((cacheWriteUsd / inputUsd).toFixed(6))
    }
  }
  return plan
}

/** 生成需要提交的 option 更新集（仅包含有变动的表）。 */
export async function applyChannelPricing(
  plan: WritebackPlan,
  current: {
    modelRatio: Record<string, number>
    completionRatio: Record<string, number>
    cacheRatio?: Record<string, number>
    createCacheRatio?: Record<string, number>
    modelPrice?: Record<string, number>
  }
): Promise<{ applied: boolean; updates: Record<string, string> }> {
  const updates: Record<string, string> = {}

  const mergeIfChanged = (
    key: string,
    next: Record<string, number>,
    base: Record<string, number> | undefined
  ) => {
    if (Object.keys(next).length === 0) return
    const merged = { ...(base ?? {}) }
    let changed = false
    for (const [model, ratio] of Object.entries(next)) {
      if (merged[model] !== ratio) {
        merged[model] = ratio
        changed = true
      }
    }
    if (changed) updates[key] = JSON.stringify(merged)
  }

  mergeIfChanged('ModelRatio', plan.modelRatio, current.modelRatio)
  mergeIfChanged('CompletionRatio', plan.completionRatio, current.completionRatio)
  mergeIfChanged('CacheRatio', plan.cacheRatio, current.cacheRatio ?? {})
  mergeIfChanged('CreateCacheRatio', plan.createCacheRatio, current.createCacheRatio ?? {})
  mergeIfChanged('ModelPrice', plan.modelPrice, current.modelPrice ?? {})

  if (Object.keys(updates).length === 0) {
    return { applied: false, updates }
  }

  // 官方 option 更新接口：逐 key 提交（服务端 handleConfigUpdate 会触发
  // pricing cache 失效与广播，无需额外通知）。
  for (const [key, value] of Object.entries(updates)) {
    const res = await api.put('/api/option/', { key, value })
    if (!res?.data?.success) {
      toast.error(`保存 ${key} 失败：${res?.data?.message ?? '未知错误'}`)
      return { applied: false, updates }
    }
  }
  return { applied: true, updates }
}
