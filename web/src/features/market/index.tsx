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
  Activity,
  HeartPulse,
  KeyRound,
  Plug,
  RefreshCw,
  ShieldCheck,
  Store,
  UserPlus,
} from 'lucide-react'
import { useMemo, useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'

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
import { FilterChip } from '@/components/ui/v2-widgets'
import { KVRow } from '@/components/ui/v2-reference'
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

function renderOutputPrice(
  output: number | null,
  hasExchangeRate: boolean,
  missingRateLabel: string
) {
  if (output === null) return <span className='text-muted-foreground'>—</span>
  return hasExchangeRate ? formatCny(output) : missingRateLabel
}

const SKELETON_ROWS = ['row-a', 'row-b', 'row-c']
const SKELETON_CELLS = ['model', 'input', 'output', 'mode', 'failover']

export function ModelMarket() {
  const { t } = useTranslation()
  const { models, isLoading, error, refetch } = usePricingData()
  const { status } = useStatus()
  const { officialPricing } = useOfficialPricing()
  // v2：搜索/品牌过滤/展开详情
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState<string | null>(null)
  const [openModel, setOpenModel] = useState<string | null>(null)
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
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (m) =>
          m.model_name.toLowerCase().includes(q) ||
          (m.vendor_name || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [defaultGroupModels, brandFilter, search])

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
          <TableCell colSpan={5}>
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
      const finalPrice = hasExchangeRate
        ? `${formatCny(prices.input)} / ${formatCny(prices.output ?? 0)}`
        : t('marketPage.exchangeRateMissing')
      const open = openModel === model.model_name
      return (
        <Fragment key={model.model_name}>
        <TableRow
          className='cursor-pointer'
          onClick={() => setOpenModel(open ? null : model.model_name)}
        >
          <TableCell>
            <div className='font-medium'>{model.model_name}</div>
            {model.vendor_name && (
              <div className='text-muted-foreground/70 text-xs'>
                {model.vendor_name}
              </div>
            )}
          </TableCell>
          <TableCell className='font-medium tabular-nums'>
            {hasExchangeRate ? formatCny(prices.input) : t('marketPage.exchangeRateMissing')}
          </TableCell>
          <TableCell className='font-medium tabular-nums'>
            {renderOutputPrice(
              prices.output,
              hasExchangeRate,
              t('marketPage.exchangeRateMissing')
            )}
          </TableCell>
          <TableCell>
            {prices.perRequest
              ? t('marketPage.mode.request')
              : t('marketPage.mode.token')}
          </TableCell>
          <TableCell>
            <Badge variant='secondary' className='gap-1'>
              <ShieldCheck className='size-3' />
              {t('marketPage.failover.badge')}
            </Badge>
            <span className='text-muted-foreground ml-2 text-xs'>
              {open ? '▲' : '▼'}
            </span>
          </TableCell>
        </TableRow>
        {open && !prices.perRequest && (
          <TableRow>
            <TableCell colSpan={5} className='bg-muted/20 p-4'>
              <div className='grid gap-4 sm:grid-cols-3'>
                <div>
                  <div className='mb-2 text-xs font-bold'>{t('marketPage.officialPeakPrice')}</div>
                  {prices.official ? (
                    <>
                      <KVRow k={t('marketPage.table.input')} v={prices.official.domesticRegion ? formatCny(prices.official.inputUsdPerMillion) : formatUsd(prices.official.inputUsdPerMillion)} />
                      <KVRow k={t('marketPage.table.output')} v={prices.official.domesticRegion ? formatCny(prices.official.outputUsdPerMillion) : formatUsd(prices.official.outputUsdPerMillion)} />
                      <KVRow k={t('marketPage.systemMultiplier')} v={formatMultiplier(model.model_ratio)} />
                      <KVRow k={t('marketPage.effectiveOfficialMultiplier')} v={prices.effectiveOfficialMultiplier == null ? '—' : formatMultiplier(prices.effectiveOfficialMultiplier)} highlight />
                      <KVRow k={t('marketPage.finalPrice')} v={finalPrice} highlight />
                    </>
                  ) : (
                    <div className='text-muted-foreground text-xs'>{t('marketPage.officialPriceNotConfigured')}</div>
                  )}
                </div>
                <div>
                  <div className='mb-2 text-xs font-bold'>{t('marketPage.health.title')}</div>
                  <KVRow k={t('marketPage.table.model')} v={model.model_name} />
                  {model.vendor_name && <KVRow k='Vendor' v={model.vendor_name} />}
                  {prices.official?.sourceUrl && (
                    <KVRow k={t('marketPage.officialPriceSource')} v={<a href={prices.official.sourceUrl} target='_blank' rel='noreferrer' className='text-primary underline underline-offset-2'>{t('marketPage.officialPriceSource')}</a>} />
                  )}
                  {prices.official && <KVRow k={t('marketPage.priceVerifiedOn')} v={prices.official.verifiedOn} />}
                </div>
                <div>
                  <div className='mb-2 text-xs font-bold'>{t('marketPage.table.failover')}</div>
                  <p className='text-muted-foreground text-xs leading-relaxed'>{t('marketPage.failover.note')}</p>
                  <Button variant='outline' size='sm' className='mt-2' render={<Link to='/keys' />}>{t('marketPage.steps.two')}</Button>
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
        {/* Hero */}
        <div className='space-y-4 text-center'>
          <div className='flex justify-center'>
            <div className='bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl'>
              <Store className='size-7' />
            </div>
          </div>
          <div className='flex flex-wrap items-center justify-center gap-3'>
            <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              {t('marketPage.title')}
            </h1>
            <Badge variant='secondary' className='gap-1'>
              <Activity className='size-3' />
              {t('marketPage.live')}
            </Badge>
          </div>
          <p className='text-muted-foreground mx-auto max-w-2xl'>
            {t('marketPage.subtitle')}
          </p>
          <p className='text-muted-foreground/70 mx-auto max-w-2xl text-xs'>
            {t('marketPage.unitNote')}
          </p>
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
                      active={search === m.model_name}
                      onClick={() =>
                        setSearch(search === m.model_name ? '' : m.model_name)
                      }
                    />
                  ))}
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
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
                  setSearch('')
                  setBrandFilter(null)
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
                    <TableHead>{t('marketPage.table.input')}</TableHead>
                    <TableHead>{t('marketPage.table.output')}</TableHead>
                    <TableHead>{t('marketPage.table.mode')}</TableHead>
                    <TableHead>{t('marketPage.table.failover')}</TableHead>
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
