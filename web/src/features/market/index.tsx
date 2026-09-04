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
import { Link } from '@tanstack/react-router'
import {
  HeartPulse,
  KeyRound,
  Plug,
  RefreshCw,
  UserPlus,
} from 'lucide-react'
import { useEffect, useMemo, useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import { useStatus } from '@/hooks/use-status'
import { useOfficialPricing } from '@/features/channels/hooks/use-official-pricing'
import { PublicLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GlassSurface } from '@/components/ui/v2-surfaces'
import { CurrencyDisplayToggle, FilterChip, getDisplayCurrency, SuccessBars } from '@/components/ui/v2-widgets'
import { KVRow, MetricBar } from '@/components/ui/v2-reference'
import { VendorIcon } from '@/components/ui/vendor-icon'
import { getPerfMetricsSummary } from '@/features/performance-metrics/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { QUOTA_TYPE_VALUES } from '@/features/pricing/constants'
import { usePricingData } from '@/features/pricing/hooks'
import type { PricingModel } from '@/features/pricing/types'

import {
  computeDisplayedPrice,
  getOfficialPrice,
  type OfficialTokenPrice,
} from './official-pricing'
import {
  isDomesticPrice,
  type OfficialPricingEntry,
} from '@/features/channels/components/pricing/types'

const DEFAULT_GROUP = 'default'

/** 线上官方价快照（official_pricing）→ 市场页 OfficialTokenPrice。
 *  方案 B 参照系：domestic 记录已是 ¥/1M，标记为已换算（不再乘汇率）；
 *  international（含空值）保持美元口径由 computeDisplayedPrice 乘汇率。
 *  快照缺失时回落到版本化前端配置（旧 official-pricing.ts，美元口径）。 */
function officialFromSnapshot(
  entry: OfficialPricingEntry | undefined,
  fallback: OfficialTokenPrice | undefined
): OfficialTokenPrice | undefined {
  if (!entry || !(entry.input > 0)) return fallback
  return {
    version: entry.verified_on ?? fallback?.version ?? '',
    model: '',
    inputUsdPerMillion: entry.input,
    outputUsdPerMillion: entry.output,
    sourceUrl: entry.source_url ?? fallback?.sourceUrl ?? '',
    verifiedOn: entry.verified_on ?? '',
    // 国内参照系标记：下游换算与展示用。
    domesticRegion: isDomesticPrice(entry),
  }
}

type ComputedPrices = {
  input: number
  output: number | null
  perRequest: boolean
  official: OfficialTokenPrice | undefined
  effectiveOfficialMultiplier: number | null
}

/** Compute display prices using the live USD exchange rate. */
function computePrices(
  model: PricingModel,
  usdExchangeRate: number | undefined,
  officialSnapshot: Record<string, OfficialPricingEntry> = {}
): ComputedPrices {
  const official = officialFromSnapshot(
    officialSnapshot[model.model_name?.toLowerCase?.()],
    getOfficialPrice(model.model_name)
  )
  if (model.quota_type === QUOTA_TYPE_VALUES.REQUEST) {
    return {
      input:
        typeof usdExchangeRate === 'number' && usdExchangeRate > 0
          ? (model.model_price || 0) * usdExchangeRate
          : Number.NaN,
      output: null,
      perRequest: true,
      official: undefined,
      effectiveOfficialMultiplier: null,
    }
  }
  const modelRatio = model.model_ratio || 0
  const completionRatio = model.completion_ratio || 1
  const validRate =
    typeof usdExchangeRate === 'number' &&
    Number.isFinite(usdExchangeRate) &&
    usdExchangeRate > 0
  const displayed = official && validRate
    ? computeDisplayedPrice(modelRatio, completionRatio, usdExchangeRate, official)
    : null
  return {
    input: validRate ? modelRatio * 2 * usdExchangeRate : Number.NaN,
    output: validRate ? modelRatio * 2 * completionRatio * usdExchangeRate : Number.NaN,
    perRequest: false,
    official,
    effectiveOfficialMultiplier: displayed?.effectiveOfficialMultiplier ?? null,
  }
}

function formatCny(value: number): string {
  if (!Number.isFinite(value)) return '-'
  const digits = value > 0 && value < 0.01 ? 4 : 2
  return `¥${value.toFixed(digits)}`
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '-'
  return `$${value.toFixed(value < 0.01 ? 4 : 2)}`
}

function formatMultiplier(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)}×` : '—'
}

/** v2：供应商品牌色块图标已抽至共享组件 @/components/ui/vendor-icon */

function formatContext(v?: number): string {
  if (!v || !Number.isFinite(v)) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return String(v)
}

const SKELETON_ROWS = ['row-a', 'row-b', 'row-c']
const SKELETON_CELLS = ['m', 'in', 'out', 'ratio', 'succ', 'tags', 'lat', 'act']

export function ModelMarket() {
  const { t } = useTranslation()
  const { models, isLoading, error, refetch } = usePricingData()
  const { status } = useStatus()
  const { officialPricing } = useOfficialPricing()
  // v2：搜索/品牌过滤/展开详情 + 计费/排序 + ¥/$ 显示偏好
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState<string | null>(null)
  const [openModel, setOpenModel] = useState<string | null>(null)
  const [billingFilter, setBillingFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [currency, setCurrency] = useState<'CNY' | 'USD'>(getDisplayCurrency)

  useEffect(() => {
    const handler = (e: Event) => {
      const c = (e as CustomEvent).detail?.currency
      if (c === 'CNY' || c === 'USD') setCurrency(c)
    }
    window.addEventListener('display-currency-change', handler)
    return () => window.removeEventListener('display-currency-change', handler)
  }, [])

  // v2：真实模型性能（成功率/延迟），供富表使用
  const perfQuery = useQuery({
    queryKey: ['market-perf-summary', 24],
    queryFn: () => getPerfMetricsSummary(24),
    staleTime: 60_000,
    retry: 1,
  })
  const perfMap = useMemo(() => {
    const map = new Map<
      string,
      { rate: number; latencyMs: number; recent?: number[] }
    >()
    for (const p of perfQuery.data?.data.models ?? []) {
      map.set(p.model_name, {
        rate: p.success_rate,
        latencyMs: p.avg_latency_ms,
        recent: p.recent_success_rates,
      })
    }
    return map
  }, [perfQuery.data])

  const usdExchangeRate = status?.usd_exchange_rate
  const hasExchangeRate =
    typeof usdExchangeRate === 'number' &&
    Number.isFinite(usdExchangeRate) &&
    usdExchangeRate > 0

  const defaultGroupModels = useMemo(
    () =>
      models.filter(
        (model) =>
          Array.isArray(model.enable_groups) &&
          model.enable_groups.includes(DEFAULT_GROUP)
      ),
    [models]
  )

  // v2：品牌聚合 + 过滤后的模型列表
  const brandChips = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of defaultGroupModels) {
      const v = m.vendor_name || ''
      if (v) counts.set(v, (counts.get(v) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [defaultGroupModels])

  const visibleModels = useMemo(() => {
    let list = defaultGroupModels
    if (brandFilter) list = list.filter((m) => m.vendor_name === brandFilter)
    if (billingFilter) {
      list = list.filter((m) =>
        billingFilter === 'request'
          ? m.quota_type === QUOTA_TYPE_VALUES.REQUEST
          : m.quota_type !== QUOTA_TYPE_VALUES.REQUEST
      )
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (m) =>
          m.model_name.toLowerCase().includes(q) ||
          (m.vendor_name || '').toLowerCase().includes(q)
      )
    }
    if (sortBy) {
      const keyFns: Record<string, (m: PricingModel) => number> = {
        ratio: (m) => m.model_ratio || 0,
        input: (m) => (m.model_ratio || 0) * 2,
        latency: (m) => perfMap.get(m.model_name)?.latencyMs ?? Number.MAX_VALUE,
      }
      const fn = keyFns[sortBy]
      if (fn) list = [...list].sort((a, b) => fn(a) - fn(b))
    }
    return list
  }, [defaultGroupModels, brandFilter, search, billingFilter, sortBy, perfMap])

  // ¥/$ 显示换算：内部价为 CNY，USD = CNY ÷ 实时汇率
  const fmtPrice = (cny: number) =>
    currency === 'USD' && hasExchangeRate
      ? formatUsd(cny / (usdExchangeRate as number))
      : formatCny(cny)

  const baseUrl = `${window.location.origin}/v1`
  const loadFailed = Boolean(error) || defaultGroupModels.length === 0

  function renderTableBody() {
    if (isLoading) {
      return SKELETON_ROWS.map((row) => (
        <TableRow key={row}>
          {SKELETON_CELLS.map((cell) => (
            <TableCell key={cell}>
              <Skeleton className='h-4 w-24' />
            </TableCell>
          ))}
        </TableRow>
      ))
    }

    if (loadFailed) {
      return (
        <TableRow>
          <TableCell colSpan={8}>
            <div className='text-muted-foreground space-y-1 py-4 text-center text-sm'>
              <p>{t('marketPage.loadFailed')}</p>
              <p className='text-muted-foreground/70 text-xs'>
                {t('marketPage.loadFailedRef')}
              </p>
              <Button
                variant='outline'
                size='sm'
                className='mt-2'
                onClick={() => refetch()}
              >
                <RefreshCw className='size-4' />
                {t('marketPage.retry')}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )
    }

    return visibleModels.map((model) => {
      const prices = computePrices(model, usdExchangeRate, officialPricing)
      const open = openModel === model.model_name
      const perf = perfMap.get(model.model_name)
      const recent = perf?.recent?.filter((r) => Number.isFinite(r)) ?? []
      const bars = recent.length
        ? recent.slice(-12).map((r) => r >= 90)
        : perf
          ? Array.from({ length: 12 }, () => perf.rate >= 90)
          : null
      // 本站缓存读价 = ratio × 2 × cache_ratio × 汇率（真实字段）
      const cacheReadCny =
        !prices.perRequest && model.cache_ratio
          ? (model.model_ratio || 0) * 2 * model.cache_ratio * (usdExchangeRate ?? 0)
          : null
      // 官网缓存命中价（official_pricing 快照真实字段）
      const officialEntry = officialPricing[model.model_name?.toLowerCase?.()]
      const officialCache = officialEntry?.cached_input

      return (
        <Fragment key={model.model_name}>
        <TableRow
          className='cursor-pointer'
          onClick={() => setOpenModel(open ? null : model.model_name)}
        >
          {/* 渠道/模型：色块图标 + 名称链接 + 官方认证 */}
          <TableCell>
            <div className='flex items-center gap-2.5'>
              <VendorIcon name={model.vendor_name} />
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-1.5'>
                  <Link
                    to='/pricing/$modelId'
                    params={{ modelId: model.model_name }}
                    onClick={(e) => e.stopPropagation()}
                    className='text-primary font-semibold hover:underline'
                  >
                    {model.model_name}
                  </Link>
                  <span className='bg-success/10 text-success inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold'>
                    ✓ {t('marketPage.tag.official')}
                  </span>
                </div>
                {model.vendor_name && (
                  <div className='text-muted-foreground/70 text-xs'>
                    {model.vendor_name}
                  </div>
                )}
              </div>
            </div>
          </TableCell>
          {/* 输入价格/缓存 */}
          <TableCell className='tabular-nums'>
            <div className='font-medium'>
              {hasExchangeRate ? fmtPrice(prices.input) : t('marketPage.exchangeRateMissing')}
              <span className='text-muted-foreground/60 ml-1 text-xs'>
                / {prices.perRequest ? t('marketPage.unit.request') : t('marketPage.unit.tokens')}
              </span>
            </div>
            <div className='text-muted-foreground/70 text-xs'>
              {t('marketPage.table.cache')}{' '}
              {cacheReadCny && hasExchangeRate ? fmtPrice(cacheReadCny) : '—'}
            </div>
          </TableCell>
          {/* 输出价格 */}
          <TableCell className='font-medium tabular-nums'>
            {prices.output == null
              ? '—'
              : hasExchangeRate
                ? fmtPrice(prices.output)
                : t('marketPage.exchangeRateMissing')}
          </TableCell>
          {/* 倍率 */}
          <TableCell>
            {prices.perRequest ? (
              <span className='text-muted-foreground text-xs'>—</span>
            ) : (
              <Badge
                variant='secondary'
                className={
                  prices.effectiveOfficialMultiplier != null &&
                  prices.effectiveOfficialMultiplier <= 1.2
                    ? 'gap-1 bg-success/15 text-success'
                    : 'gap-1'
                }
              >
                {prices.effectiveOfficialMultiplier == null
                  ? '—'
                  : formatMultiplier(prices.effectiveOfficialMultiplier)}
              </Badge>
            )}
          </TableCell>
          {/* 成功率（真实 perf） */}
          <TableCell>
            {bars ? (
              <SuccessBars
                bars={bars}
                percentage={`${(perf?.rate ?? 0).toFixed(1)}%`}
              />
            ) : (
              <span className='text-muted-foreground text-xs'>—</span>
            )}
          </TableCell>
          {/* 特性标签 */}
          <TableCell>
            <div className='flex flex-wrap gap-1'>
              <Badge variant='secondary' className='gap-1 text-[10.5px]'>
                {t('marketPage.tag.official')}
              </Badge>
              {prices.perRequest && (
                <Badge variant='secondary' className='gap-1 text-[10.5px]'>
                  {t('marketPage.tag.request')}
                </Badge>
              )}
              {!prices.perRequest && prices.input > 0 && prices.input < 1 && (
                <Badge className='gap-1 bg-success/15 text-[10.5px] text-success'>
                  {t('marketPage.tag.lowprice')}
                </Badge>
              )}
            </div>
          </TableCell>
          {/* 延迟 */}
          <TableCell className='tabular-nums'>
            {perf ? `${(perf.latencyMs / 1000).toFixed(2)}s` : '—'}
          </TableCell>
          {/* 操作 */}
          <TableCell>
            <Link to='/sign-in' onClick={(e) => e.stopPropagation()}>
              <Button size='sm' className='h-8 rounded-full px-4 text-xs'>
                {t('marketPage.createToken')}
              </Button>
            </Link>
            <span className='text-muted-foreground ml-2 text-xs'>
              {open ? '▲' : '▼'}
            </span>
          </TableCell>
        </TableRow>
        {/* 展开式三栏详情（严格对齐设计稿：价格对比 / 来源 / 路由指标） */}
        {open && (
          <TableRow>
            <TableCell colSpan={8} className='bg-muted/20 p-4'>
              <div className='grid gap-4 sm:grid-cols-3'>
                <div>
                  <div className='mb-2 flex items-center justify-between text-xs font-bold'>
                    {t('marketPage.detail.priceCompare')}
                    <span className='text-muted-foreground/60 font-normal'>
                      {t('marketPage.unit.tokens')}
                    </span>
                  </div>
                  {prices.official ? (
                    <>
                      <KVRow k={t('marketPage.detail.officialInput')} v={prices.official.domesticRegion ? formatCny(prices.official.inputUsdPerMillion) : formatUsd(prices.official.inputUsdPerMillion)} />
                      <KVRow k={t('marketPage.detail.officialCache')} v={officialCache != null ? (prices.official.domesticRegion ? formatCny(officialCache) : formatUsd(officialCache)) : '—'} />
                      <KVRow k={t('marketPage.detail.officialOutput')} v={prices.official.domesticRegion ? formatCny(prices.official.outputUsdPerMillion) : formatUsd(prices.official.outputUsdPerMillion)} />
                      <KVRow k={t('marketPage.detail.siteInput')} v={hasExchangeRate ? fmtPrice(prices.input) : '—'} highlight />
                      <KVRow k={t('marketPage.detail.siteCache')} v={cacheReadCny && hasExchangeRate ? fmtPrice(cacheReadCny) : '—'} />
                      <KVRow k={t('marketPage.detail.siteOutput')} v={prices.output != null && hasExchangeRate ? fmtPrice(prices.output) : '—'} highlight />
                      <KVRow
                        k={t('marketPage.effectiveOfficialMultiplier')}
                        v={prices.effectiveOfficialMultiplier == null ? '—' : formatMultiplier(prices.effectiveOfficialMultiplier)}
                        highlight
                      />
                    </>
                  ) : (
                    <div className='text-muted-foreground text-xs'>{t('marketPage.officialPriceNotConfigured')}</div>
                  )}
                </div>
                <div>
                  <div className='mb-2 text-xs font-bold'>{t('marketPage.detail.source')}</div>
                  <KVRow k={t('marketPage.detail.channel')} v={model.vendor_name || '—'} />
                  <KVRow
                    k={t('marketPage.detail.certification')}
                    v={
                      <span className='inline-flex gap-1'>
                        <span className='inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10.5px] font-semibold text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'>
                          {t('marketPage.detail.direct')}
                        </span>
                        <span className='bg-success/10 text-success inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold'>
                          ✓ {t('marketPage.tag.official')}
                        </span>
                      </span>
                    }
                  />
                  <KVRow k={t('marketPage.detail.origin')} v={model.vendor_name || '—'} />
                  <KVRow k={t('marketPage.detail.context')} v={formatContext(model.context_length)} />
                  <KVRow k={t('marketPage.detail.verify')} v={t('marketPage.detail.noShare')} />
                  {prices.official?.sourceUrl && (
                    <KVRow
                      k={t('marketPage.priceVerifiedOn')}
                      v={
                        <a href={prices.official.sourceUrl} target='_blank' rel='noreferrer' className='text-primary underline underline-offset-2'>
                          {prices.official.verifiedOn}
                        </a>
                      }
                    />
                  )}
                </div>
                <div>
                  <div className='mb-2 text-xs font-bold'>{t('marketPage.detail.routing')}</div>
                  {bars ? (
                    <>
                      <MetricBar
                        label={t('marketPage.detail.realtime')}
                        bars={bars}
                        value={`${(recent[recent.length - 1] ?? perf?.rate ?? 0).toFixed(1)}%`}
                      />
                      <MetricBar
                        label={t('marketPage.detail.h24')}
                        bars={Array.from({ length: 12 }, () => (perf?.rate ?? 0) >= 90)}
                        value={`${(perf?.rate ?? 0).toFixed(1)}%`}
                      />
                    </>
                  ) : (
                    <p className='text-muted-foreground text-xs'>—</p>
                  )}
                  <KVRow k={t('marketPage.table.latency')} v={perf ? `${(perf.latencyMs / 1000).toFixed(2)}s` : '—'} />
                  <KVRow k={t('marketPage.detail.rateLimit')} v='—' />
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}
        </Fragment>
      )
    })
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-5xl space-y-10 py-8'>
        {/* v2: 页头（标题左 + ¥/$ 切换右） */}
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              {t('marketPage.title')}
            </h1>
            <p className='text-muted-foreground mt-2 max-w-2xl text-sm'>
              {t('marketPage.subtitle')}
            </p>
          </div>
          <div className='flex shrink-0 flex-col items-end gap-2 pt-1'>
            <CurrencyDisplayToggle />
            <span className='text-muted-foreground/70 text-xs'>
              {t('marketPage.unitNote')}
            </span>
          </div>
        </div>

        {/* v2: 品牌快选 + 模型快选 + 筛选工具栏 */}
        {!loadFailed && (
          <GlassSurface variant='shell' className='space-y-4'>
            <div>
              <div className='mb-2 text-sm font-bold'>
                {t('marketPage.quickBrands')}
              </div>
              <div className='flex flex-wrap gap-2'>
                {brandChips.map(([name, count]) => (
                  <FilterChip
                    key={name}
                    icon={<VendorIcon name={name} size='size-6' />}
                    title={name}
                    subtitle={t('marketPage.modelsCount', { count })}
                    active={brandFilter === name}
                    onClick={() =>
                      setBrandFilter(brandFilter === name ? null : name)
                    }
                  />
                ))}
              </div>
            </div>
            <div>
              <div className='mb-2 text-sm font-bold'>
                {t('marketPage.quickModels')}
              </div>
              <div className='flex flex-wrap gap-2'>
                {(brandFilter
                  ? defaultGroupModels.filter(
                      (m) => m.vendor_name === brandFilter
                    )
                  : defaultGroupModels
                )
                  .slice(0, 12)
                  .map((m) => (
                    <FilterChip
                      key={m.model_name}
                      title={m.model_name}
                      subtitle={
                        hasExchangeRate
                          ? `${t('marketPage.table.input')} ${fmtPrice((m.model_ratio || 0) * 2 * (usdExchangeRate ?? 0))}/1M`
                          : undefined
                      }
                      active={search === m.model_name}
                      onClick={() =>
                        setSearch(search === m.model_name ? '' : m.model_name)
                      }
                    />
                  ))}
              </div>
            </div>
            {/* v2: 完整筛选工具栏（品牌/计费类型/排序/搜索/刷新/重置） */}
            <div className='flex flex-wrap items-center gap-2'>
              <select
                value={brandFilter ?? ''}
                onChange={(e) => setBrandFilter(e.target.value || null)}
                className='border-border bg-card/80 rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary'
              >
                <option value=''>{t('marketPage.brand.all')}</option>
                {brandChips.map(([name]) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={billingFilter}
                onChange={(e) => setBillingFilter(e.target.value)}
                className='border-border bg-card/80 rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary'
              >
                <option value=''>{t('marketPage.billing.all')}</option>
                <option value='token'>{t('marketPage.billing.token')}</option>
                <option value='request'>{t('marketPage.billing.request')}</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className='border-border bg-card/80 rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary'
              >
                <option value=''>{t('marketPage.sort.default')}</option>
                <option value='ratio'>{t('marketPage.sort.ratio')}</option>
                <option value='input'>{t('marketPage.sort.input')}</option>
                <option value='latency'>{t('marketPage.sort.latency')}</option>
              </select>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('marketPage.searchPlaceholder')}
                className='border-border bg-card/80 min-w-52 flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary'
              />
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  refetch()
                  perfQuery.refetch()
                }}
              >
                <RefreshCw className='size-4' />
                {t('marketPage.refresh')}
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setSearch('')
                  setBrandFilter(null)
                  setBillingFilter('')
                  setSortBy('')
                }}
              >
                {t('marketPage.resetFilters')}
              </Button>
            </div>
          </GlassSurface>
        )}

        {/* Price table */}
        <section className='space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <h2 className='text-xl font-semibold tracking-tight'>
              {t('marketPage.table.title')}
            </h2>
            <span className='text-muted-foreground/70 text-xs'>
              {t('marketPage.dataSource')}
            </span>
          </div>
          <GlassSurface variant='shell' className='p-0 overflow-hidden'>
            <Card className='border-0 shadow-none ring-0'>
            <CardContent className='px-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('marketPage.table.model')}</TableHead>
                    <TableHead>{t('marketPage.table.inputCache')}</TableHead>
                    <TableHead>{t('marketPage.table.output')}</TableHead>
                    <TableHead>{t('marketPage.table.ratio')}</TableHead>
                    <TableHead>{t('marketPage.table.success')}</TableHead>
                    <TableHead>{t('marketPage.table.tags')}</TableHead>
                    <TableHead>{t('marketPage.table.latency')}</TableHead>
                    <TableHead>{t('marketPage.table.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderTableBody()}</TableBody>
              </Table>
            </CardContent>
          </Card>
          </GlassSurface>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            {t('marketPage.failover.note')}
          </p>
          <p className='text-muted-foreground/70 text-xs leading-relaxed'>
            {t('marketPage.rechargeNote')}
          </p>
        </section>

        {/* Three-step onboarding */}
        <section className='space-y-4'>
          <h2 className='text-xl font-semibold tracking-tight'>
            {t('marketPage.steps.title')}
          </h2>
          <div className='grid gap-4 md:grid-cols-3'>
            <Link to='/register' className='block h-full'>
              <Card className='h-full transition-colors hover:border-primary/40'>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg'>
                      <UserPlus className='size-4.5' />
                    </div>
                    <span className='text-muted-foreground/40 text-2xl font-bold'>
                      1
                    </span>
                  </div>
                  <CardTitle className='text-base'>
                    {t('marketPage.steps.one')}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
            <Link to='/keys' className='block h-full'>
              <Card className='h-full transition-colors hover:border-primary/40'>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg'>
                      <KeyRound className='size-4.5' />
                    </div>
                    <span className='text-muted-foreground/40 text-2xl font-bold'>
                      2
                    </span>
                  </div>
                  <CardTitle className='text-base'>
                    {t('marketPage.steps.two')}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
            <Card className='h-full'>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg'>
                    <Plug className='size-4.5' />
                  </div>
                  <span className='text-muted-foreground/40 text-2xl font-bold'>
                    3
                  </span>
                </div>
                <CardTitle className='text-base'>
                  {t('marketPage.steps.three')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <code className='bg-muted block overflow-x-auto rounded-md px-2 py-1.5 font-mono text-xs'>
                  {baseUrl}
                </code>
              </CardContent>
            </Card>
          </div>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            {t('marketPage.steps.clientsNote')}
          </p>
        </section>

        {/* Channel health */}
        <section className='space-y-4'>
          <h2 className='text-xl font-semibold tracking-tight'>
            {t('marketPage.health.title')}
          </h2>
          <Card>
            <CardContent className='flex flex-col items-center gap-4 sm:flex-row sm:justify-between'>
              <div className='flex items-center gap-3'>
                <HeartPulse className='text-muted-foreground size-5 shrink-0' />
                <CardDescription className='leading-relaxed'>
                  {t('marketPage.health.desc')}
                </CardDescription>
              </div>
              <Button variant='outline' size='sm' render={<Link to='/health' />}>
                {t('marketPage.health.link')}
              </Button>
            </CardContent>
          </Card>
          <p className='text-muted-foreground/70 text-xs leading-relaxed'>
            {t('marketPage.pricingReference')}
          </p>
        </section>
      </div>
    </PublicLayout>
  )
}
