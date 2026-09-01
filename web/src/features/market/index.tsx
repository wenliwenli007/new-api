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
import { useMemo } from 'react'
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
import type { OfficialPricingEntry } from '@/features/channels/components/pricing/types'

const DEFAULT_GROUP = 'default'

/** 线上官方价快照（official_pricing）→ 市场页 OfficialTokenPrice。
 *  快照缺失时回落到版本化前端配置（旧 official-pricing.ts）。 */
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

    return defaultGroupModels.map((model) => {
      const prices = computePrices(model, usdExchangeRate, officialPricing)
      const finalPrice = hasExchangeRate
        ? `${formatCny(prices.input)} / ${formatCny(prices.output ?? 0)}`
        : t('marketPage.exchangeRateMissing')
      return (
        <TableRow key={model.model_name}>
          <TableCell>
            <div className='font-medium'>{model.model_name}</div>
            {model.vendor_name && (
              <div className='text-muted-foreground/70 text-xs'>
                {model.vendor_name}
              </div>
            )}
            {!prices.perRequest && (
              <div className='text-muted-foreground mt-2 space-y-1 text-xs'>
                {prices.official ? (
                  <>
                    <div>
                      {t('marketPage.officialPeakPrice')}:{' '}
                      {formatUsd(prices.official.inputUsdPerMillion)} /{' '}
                      {formatUsd(prices.official.outputUsdPerMillion)} / M
                    </div>
                    <div>
                      {t('marketPage.systemMultiplier')}: {formatMultiplier(model.model_ratio)}
                    </div>
                    <div>
                      {t('marketPage.effectiveOfficialMultiplier')}:{' '}
                      {prices.effectiveOfficialMultiplier == null
                        ? '—'
                        : formatMultiplier(prices.effectiveOfficialMultiplier)}
                    </div>
                    <div>
                      {t('marketPage.finalPrice')}: {finalPrice}
                    </div>
                    <div>
                      {t('marketPage.officialPriceSource')}: {' '}
                      <a
                        href={prices.official.sourceUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='underline underline-offset-2'
                      >
                        {prices.official.sourceUrl}
                      </a>
                    </div>
                    <div>
                      {t('marketPage.priceVerifiedOn')}: {prices.official.verifiedOn}
                    </div>
                  </>
                ) : (
                  <div>{t('marketPage.officialPriceNotConfigured')}</div>
                )}
              </div>
            )}
          </TableCell>
          <TableCell className='font-medium tabular-nums'>
            {hasExchangeRate ? formatCny(prices.input) : t('marketPage.exchangeRateMissing')}
            <span className='text-muted-foreground/60 ml-1 text-xs'>
              /{' '}
              {prices.perRequest
                ? t('marketPage.unit.request')
                : t('marketPage.unit.tokens')}
            </span>
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
          </TableCell>
        </TableRow>
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
          <Card>
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
