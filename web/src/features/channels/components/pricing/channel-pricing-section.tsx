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
 * ChannelPricingSection — 渠道编辑器「各渠道模型价格」节（需求 B）。
 *
 * 交互（与原型 B 一致）：
 *  - 每个模型一行：官方基准价标签（来自 official_pricing，USD/1M）+ 价格倍率输入；
 *  - 倍率变化 → 四价（输入/缓存读/缓存写/输出，¥/1M）实时联动 = 官方价 × 倍率 × 汇率；
 *  - 手改任一价格 → 该模型切换 manual 模式（倍率框锁定），可一键恢复联动；
 *  - 保存时由父级 useChannelPricingWriteback 换算写回全局倍率表（USD 语义）。
 *
 * 内部状态全部为人民币展示口径；export 只做
 *    USD = CNY ÷ usdExchangeRate
 * 换算（channel form 里不含价格，价格统一落全局表）。
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSystemConfigStore } from '@/stores/system-config-store'

import type { OfficialPricingEntry } from './types'

/** 某模型的渠道级定价（CNY/1M 展示口径）。 */
export type ChannelModelPricing = {
  /** 0~10，乘以官方基准价；manual 模式下为 null。 */
  ratio: number | null
  mode: 'linked' | 'manual'
  input: number | null
  cachedInput: number | null
  cacheWrite: number | null
  output: number | null
}

/** 换算回全局表的 USD/1M 四元组（保存载荷）。 */
export type GlobalPricingPayload = {
  inputUsdPerMillion: number
  cachedInputUsdPerMillion: number | null
  cacheWriteUsdPerMillion: number | null
  outputUsdPerMillion: number | null
}

export const PRICING_MODES = ['token', 'perCall'] as const
export type PricingMode = (typeof PRICING_MODES)[number]

function formatCny(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return `¥${value.toFixed(2)}`
}

/** CNY → USD/1M（保存换算；汇率缺省按 1 兜底防 NaN）。 */
export function cnyToUsdPerMillion(
  cny: number | null,
  exchangeRate: number
): number | null {
  if (cny == null || !Number.isFinite(cny) || cny <= 0) return null
  const rate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1
  return Number((cny / rate).toFixed(6))
}

/** 由当前渠道定价生成保存载荷（保存时由父级写入全局倍率表）。
 *  mode 仅用于文档语义区分：按次场景父级应传 input=单次价并自行写 ModelPrice。 */
export function buildGlobalPricingPayload(
  pricing: ChannelModelPricing,
  _mode: PricingMode,
  exchangeRate: number
): GlobalPricingPayload | null {
  const input = cnyToUsdPerMillion(pricing.input, exchangeRate)
  if (input == null) return null
  return {
    inputUsdPerMillion: input,
    cachedInputUsdPerMillion: cnyToUsdPerMillion(pricing.cachedInput, exchangeRate),
    cacheWriteUsdPerMillion: cnyToUsdPerMillion(pricing.cacheWrite, exchangeRate),
    outputUsdPerMillion: cnyToUsdPerMillion(pricing.output, exchangeRate),
  }
}

type ModelPricingBlockProps = {
  model: string
  official: OfficialPricingEntry | undefined
  exchangeRate: number
  value: ChannelModelPricing
  onChange: (next: ChannelModelPricing) => void
  onModeChange?: (mode: PricingMode) => void
  conflict?: boolean
}

function ModelPricingBlock({
  model,
  official,
  exchangeRate,
  value,
  onChange,
  onModeChange,
  conflict,
}: ModelPricingBlockProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<PricingMode>('token')

  const switchMode = (next: PricingMode) => {
    setMode(next)
    onModeChange?.(next)
  }

  const officialCny = useMemo(() => {
    if (!official) return null
    return {
      input: official.input * exchangeRate,
      output: official.output * exchangeRate,
      cachedInput: (official.cached_input ?? 0) * exchangeRate,
      cacheWrite: (official.cache_write ?? official.input) * exchangeRate,
    }
  }, [official, exchangeRate])

  const applyRatio = (ratio: number | null) => {
    if (ratio == null || !officialCny || officialCny.input <= 0) {
      // 无官方基准价：倍率不可用，直接手填。
      onChange({ ...value, ratio: null, mode: 'manual' })
      return
    }
    const clamped = Math.min(Math.max(ratio, 0), 10)
    onChange({
      ratio: clamped,
      mode: 'linked',
      input: Number((officialCny.input * clamped).toFixed(2)),
      cachedInput: Number((officialCny.cachedInput * clamped).toFixed(2)),
      cacheWrite: Number((officialCny.cacheWrite * clamped).toFixed(2)),
      output: Number((officialCny.output * clamped).toFixed(2)),
    })
  }

  const enterManual = (patch: Partial<ChannelModelPricing>) => {
    onChange({ ...value, ...patch, mode: 'manual' })
  }

  const priceField = (
    label: string,
    field: 'input' | 'cachedInput' | 'cacheWrite' | 'output',
    disabled: boolean
  ) => (
    <div className='space-y-1'>
      <Label className='text-muted-foreground text-[11px]'>{label}</Label>
      <Input
        type='number'
        min='0'
        step='0.01'
        className='text-right font-semibold'
        value={value[field] ?? ''}
        disabled={disabled}
        onChange={(e) =>
          enterManual({ [field]: e.target.value === '' ? null : Number(e.target.value) })
        }
      />
      <div className='text-muted-foreground text-right text-[10px]'>¥/1M tokens</div>
    </div>
  )

  const usdPreview = useMemo(() => {
    const input = cnyToUsdPerMillion(value.input, exchangeRate)
    if (input == null) return null
    const output = cnyToUsdPerMillion(value.output, exchangeRate)
    return {
      modelRatio: input / 2,
      completionRatio:
        output != null && input > 0 ? Number((output / input).toFixed(4)) : null,
      cacheRatio:
        value.cachedInput != null && input > 0
          ? Number((cnyToUsdPerMillion(value.cachedInput, exchangeRate)! / input).toFixed(4))
          : null,
    }
  }, [value, exchangeRate])

  return (
    <div className='bg-muted/10 space-y-3 rounded-lg border p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-sm font-bold'>{model}</span>
          {official ? (
            <Badge variant='outline' className='text-amber-500'>
              {t('Official {{in}} / {{cached}} / {{out}} /1M', {
                in: formatCny(officialCny?.input),
                cached: formatCny(officialCny?.cachedInput),
                out: formatCny(officialCny?.output),
              })}
            </Badge>
          ) : (
            <Badge variant='outline' className='text-amber-500'>
              {t('官方基准价未录入')}
            </Badge>
          )}
          {conflict && <Badge variant='destructive'>{t('与其他渠道定价冲突')}</Badge>}
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-xs'>
            {mode === 'token' ? t('按 Token') : t('按次')}
          </span>
          <Switch
            checked={mode === 'perCall'}
            onCheckedChange={(on) => switchMode(on ? 'perCall' : 'token')}
            aria-label={t('Billing mode')}
          />
        </div>
      </div>

      {mode === 'token' ? (
        <>
          <div className='grid items-center gap-3 sm:grid-cols-[110px_140px_1fr]'>
            <Label className='text-muted-foreground text-right text-xs'>
              {t('价格倍率')}
            </Label>
            <Input
              type='number'
              min='0'
              max='10'
              step='0.1'
              className='text-primary text-center text-base font-bold'
              value={value.ratio ?? ''}
              disabled={value.mode === 'manual' || !official}
              onChange={(e) => applyRatio(e.target.value === '' ? null : Number(e.target.value))}
            />
            <div className='text-muted-foreground text-[11px]'>
              {value.mode === 'linked'
                ? t('0–10 × 官方参考价；修改时自动更新下方 token 价格')
                : t('已手动覆盖价格 — 恢复倍率联动')}
              {value.mode === 'manual' && official && (
                <button
                  type='button'
                  className='text-primary ml-1 underline'
                  onClick={() => applyRatio(value.ratio ?? 1)}
                >
                  {t('恢复联动')}
                </button>
              )}
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
            {priceField(t('输入价格'), 'input', false)}
            {priceField(t('缓存读取价格'), 'cachedInput', false)}
            {priceField(t('缓存写入价格'), 'cacheWrite', false)}
            {priceField(t('输出价格'), 'output', false)}
          </div>
          {usdPreview && (
            <div className='text-accent-foreground/80 bg-accent/10 rounded-md border border-dashed px-3 py-2 text-xs'>
              {t('换算回全局表：ModelRatio={{mr}} · CompletionRatio={{cr}} · CacheRatio={{cache}}', {
                mr: usdPreview.modelRatio.toFixed(3),
                cr: usdPreview.completionRatio ?? '-',
                cache: usdPreview.cacheRatio ?? '-',
              })}
            </div>
          )}
        </>
      ) : (
        <div className='grid items-center gap-3 sm:grid-cols-[110px_180px_1fr]'>
          <Label className='text-muted-foreground text-right text-xs'>
            {t('每次调用价格')}
          </Label>
          <Input
            type='number'
            min='0'
            step='0.01'
            className='text-primary text-center text-base font-bold'
            value={value.input ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                mode: 'manual',
                input: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
          <div className='text-muted-foreground text-[11px]'>
            {t('按次计费写入 ModelPrice（优先于倍率）；人民币 × 汇率换算美元')}
          </div>
        </div>
      )}
    </div>
  )
}

export type ChannelPricingSectionProps = {
  /** 渠道当前模型列表（定价行随模型列表增减）。 */
  models: string[]
  /** official_pricing 快照（model 小写 → USD/1M）。 */
  officialPricing: Record<string, OfficialPricingEntry>
  /** 同模型在其他启用渠道已存在定价的集合（冲突标记）。 */
  conflictedModels?: Set<string>
  /** 每个模型的定价状态。 */
  value: Record<string, ChannelModelPricing>
  onChange: (model: string, next: ChannelModelPricing) => void
  /** 按次/按 Token 模式切换（保存时决定写 ModelPrice 还是倍率表）。 */
  onModeChange?: (model: string, mode: PricingMode) => void
}

export function ChannelPricingSection({
  models,
  officialPricing,
  conflictedModels,
  value,
  onChange,
  onModeChange,
}: ChannelPricingSectionProps) {
  const { t } = useTranslation()
  const currency = useSystemConfigStore((s) => s.config.currency)
  const exchangeRate = useMemo(
    () =>
      Number.isFinite(currency.usdExchangeRate) && currency.usdExchangeRate > 0
        ? currency.usdExchangeRate
        : 1,
    [currency.usdExchangeRate]
  )

  return (
    <div className='space-y-3'>
      <p className='text-muted-foreground text-xs'>
        {t('价格以人民币保存；保存时自动换算回全局倍率表（美元语义），计费内核不变。')}
      </p>
      {models.length === 0 && (
        <p className='text-muted-foreground text-xs'>{t('先在上方选择模型，再配置价格。')}</p>
      )}
      {models.map((model) => (
        <ModelPricingBlock
          key={model}
          model={model}
          official={officialPricing[model.toLowerCase()]}
          exchangeRate={exchangeRate}
          value={
            value[model] ?? { ratio: null, mode: 'manual', input: null, cachedInput: null, cacheWrite: null, output: null }
          }
          onChange={(next) => onChange(model, next)}
          onModeChange={(m) => onModeChange?.(model, m)}
          conflict={conflictedModels?.has(model)}
        />
      ))}
    </div>
  )
}
