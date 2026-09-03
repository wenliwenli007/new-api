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
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Activity, BadgeCheck, HeartPulse, RefreshCw, Store } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { KVRow, MetricBar } from '@/components/ui/v2-reference'
import { GlassSurface } from '@/components/ui/v2-surfaces'
import { SuccessBars } from '@/components/ui/v2-widgets'
import { useOfficialPricing } from '@/features/channels/hooks/use-official-pricing'
import { getUptimeStatus } from '@/features/dashboard/api'
import type { UptimeMonitor } from '@/features/dashboard/types'
import { getPerfMetricsSummary } from '@/features/performance-metrics/api'
import {
  formatLatency,
  formatThroughput,
} from '@/features/performance-metrics/lib/format'
import type { PerfModelSummary } from '@/features/performance-metrics/types'
import { cn } from '@/lib/utils'

const PERF_WINDOW_HOURS = 24
const BAR_COUNT = 12
/** A recent window counts as a "hit" bar when its success rate reaches this. */
const SUCCESS_HIT_THRESHOLD = 90

const MONITOR_STATUS_DOT_CLASS: Record<number, string> = {
  1: 'bg-emerald-500',
  0: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-blue-500',
}

/** Map a model's recent success-rate series to boolean hit bars. */
function successBars(model: PerfModelSummary): boolean[] {
  const rates = (model.recent_success_rates ?? []).filter((rate) =>
    Number.isFinite(rate)
  )
  const source = rates.length > 0 ? rates.slice(-BAR_COUNT) : [model.success_rate]
  return source.map((rate) => rate >= SUCCESS_HIT_THRESHOLD)
}

/** Synthesize boolean bars from a 0-1 uptime fraction. */
function uptimeBars(uptime: number): boolean[] {
  const fraction = Number.isFinite(uptime) ? Math.min(Math.max(uptime, 0), 1) : 0
  const hits = Math.round(fraction * BAR_COUNT)
  return Array.from({ length: BAR_COUNT }, (_, i) => i < hits)
}

function ModelHealthRow({ model }: { model: PerfModelSummary }) {
  const { t } = useTranslation()
  const bars = successBars(model)
  const pct = Number.isFinite(model.success_rate)
    ? `${model.success_rate.toFixed(1)}%`
    : '—'

  return (
    <div className='border-border/40 bg-card/40 rounded-xl border p-4'>
      <MetricBar
        label={model.model_name}
        bars={bars}
        value={pct}
        className='[&>span:first-child]:w-36 [&>span:first-child]:truncate [&>span:first-child]:font-mono [&>span:first-child]:text-xs sm:[&>span:first-child]:w-48'
      />
      <div className='text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
        <span>
          {t('healthPage.metrics.latency')}{' '}
          <span className='text-foreground font-mono font-semibold tabular-nums'>
            {formatLatency(model.avg_latency_ms)}
          </span>
        </span>
        <span>
          {t('healthPage.metrics.tps')}{' '}
          <span className='text-foreground font-mono font-semibold tabular-nums'>
            {formatThroughput(model.avg_tps)}
          </span>
        </span>
        <span>
          {t('healthPage.metrics.requests')}{' '}
          <span className='text-foreground font-mono font-semibold tabular-nums'>
            {typeof model.request_count === 'number'
              ? model.request_count.toLocaleString()
              : '—'}
          </span>
        </span>
      </div>
    </div>
  )
}

function MonitorRow({ monitor }: { monitor: UptimeMonitor }) {
  const dotClass =
    MONITOR_STATUS_DOT_CLASS[monitor.status] ?? 'bg-muted-foreground/40'
  const uptimePct = `${((monitor.uptime ?? 0) * 100).toFixed(2)}%`

  return (
    <div className='flex items-center justify-between gap-3 py-1.5'>
      <div className='flex min-w-0 items-center gap-2.5'>
        <span
          className={cn('size-2 shrink-0 rounded-full', dotClass)}
          aria-hidden='true'
        />
        <span className='truncate text-sm'>{monitor.name}</span>
        {monitor.group && (
          <span className='text-muted-foreground/40 shrink-0 text-xs'>
            ({monitor.group})
          </span>
        )}
      </div>
      <SuccessBars
        bars={uptimeBars(monitor.uptime ?? 0)}
        label={monitor.name}
        percentage={uptimePct}
      />
    </div>
  )
}

export function ChannelHealth() {
  const { t } = useTranslation()

  const perfQuery = useQuery({
    queryKey: ['perf-metrics-summary', PERF_WINDOW_HOURS],
    queryFn: () => getPerfMetricsSummary(PERF_WINDOW_HOURS),
    staleTime: 60 * 1000,
    retry: false,
  })

  const uptimeQuery = useQuery({
    queryKey: ['uptime-status'],
    queryFn: getUptimeStatus,
    staleTime: 60 * 1000,
    retry: false,
  })

  const { officialPricing } = useOfficialPricing()
  const officialCount = Object.keys(officialPricing || {}).length
  const latestVerified = useMemo(() => {
    const dates = Object.values(officialPricing || {})
      .map((entry) => entry.verified_on)
      .filter(Boolean)
      .sort()
    return dates[dates.length - 1] || ''
  }, [officialPricing])

  const models = perfQuery.data?.data.models ?? []
  const uptimeGroups = uptimeQuery.data?.data ?? []
  const updatedAt = perfQuery.dataUpdatedAt
    ? dayjs(perfQuery.dataUpdatedAt)
    : null

  function handleRefresh() {
    void perfQuery.refetch()
    void uptimeQuery.refetch()
  }

  function renderModelHealth() {
    if (perfQuery.isLoading) {
      return (
        <div className='space-y-3'>
          {['model-a', 'model-b', 'model-c'].map((key) => (
            <Skeleton key={key} className='h-20 w-full rounded-xl' />
          ))}
        </div>
      )
    }

    if (perfQuery.isError) {
      return (
        <div className='text-muted-foreground flex flex-col items-center gap-3 py-8 text-center'>
          <p className='text-sm font-medium'>{t('healthPage.loadFailed')}</p>
          <Button variant='outline' size='sm' onClick={handleRefresh}>
            <RefreshCw className='size-4' />
            {t('healthPage.refresh')}
          </Button>
        </div>
      )
    }

    if (models.length === 0) {
      return (
        <div className='text-muted-foreground flex flex-col items-center gap-2 py-8 text-center'>
          <p className='text-sm font-medium'>{t('healthPage.empty.title')}</p>
          <p className='text-xs'>{t('healthPage.empty.desc')}</p>
        </div>
      )
    }

    return (
      <div className='space-y-3'>
        {models.map((model) => (
          <ModelHealthRow key={model.model_name} model={model} />
        ))}
      </div>
    )
  }

  function renderUptime() {
    if (uptimeQuery.isLoading) {
      return (
        <div className='space-y-2'>
          {['monitor-a', 'monitor-b', 'monitor-c'].map((key) => (
            <Skeleton key={key} className='h-7 w-full' />
          ))}
        </div>
      )
    }

    if (uptimeGroups.length === 0) {
      return (
        <p className='text-muted-foreground py-6 text-center text-sm'>
          {t('No uptime monitoring configured')}
        </p>
      )
    }

    return (
      <div className='space-y-4'>
        {uptimeGroups.map((group) => (
          <div key={group.categoryName}>
            <div className='mb-1 flex items-center gap-2'>
              <h4 className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                {group.categoryName}
              </h4>
              <span className='text-muted-foreground/40 font-mono text-xs tabular-nums'>
                {group.monitors?.length || 0}
              </span>
            </div>
            <div className='divide-border/40 divide-y'>
              {group.monitors?.map((monitor) => (
                <MonitorRow key={monitor.name} monitor={monitor} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-4xl space-y-6 py-8'>
        {/* Hero */}
        <div className='space-y-4 text-center'>
          <div className='flex justify-center'>
            <div className='bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl'>
              <HeartPulse className='size-7' />
            </div>
          </div>
          <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            {t('healthPage.title')}
          </h1>
          <p className='text-muted-foreground mx-auto max-w-2xl'>
            {t('healthPage.subtitle')}
          </p>
          <div className='flex items-center justify-center gap-3'>
            {updatedAt?.isValid() && (
              <p className='text-muted-foreground/70 text-xs'>
                {t('healthPage.updated', {
                  time: updatedAt.format('YYYY-MM-DD HH:mm:ss'),
                })}
              </p>
            )}
            <Button
              variant='outline'
              size='sm'
              onClick={handleRefresh}
              disabled={perfQuery.isFetching || uptimeQuery.isFetching}
            >
              <RefreshCw
                className={cn(
                  'size-4',
                  (perfQuery.isFetching || uptimeQuery.isFetching) &&
                    'animate-spin'
                )}
              />
              {t('healthPage.refresh')}
            </Button>
          </div>
        </div>

        {/* Official price pipeline status */}
        <GlassSurface variant='card'>
          <div className='mb-2 flex items-center gap-2'>
            <span className='bg-success/10 text-success flex size-7 items-center justify-center rounded-lg'>
              <BadgeCheck className='size-4' />
            </span>
            <h2 className='text-sm font-bold'>
              {t('healthPage.sections.pricingPipeline')}
            </h2>
          </div>
          {officialCount > 0 ? (
            <div>
              <KVRow
                k={t('healthPage.pipeline.entries')}
                v={officialCount}
                highlight
              />
              <KVRow
                k={t('healthPage.pipeline.latestVerified')}
                v={latestVerified || '—'}
              />
            </div>
          ) : (
            <p className='text-muted-foreground py-2 text-center text-xs'>
              {t('healthPage.pipeline.empty')}
            </p>
          )}
        </GlassSurface>

        {/* Model health (last 24h) */}
        <GlassSurface variant='shell' className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span className='bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg'>
              <HeartPulse className='size-4' />
            </span>
            <h2 className='text-sm font-bold'>
              {t('healthPage.sections.models', {
                hours: PERF_WINDOW_HOURS,
              })}
            </h2>
          </div>
          {renderModelHealth()}
        </GlassSurface>

        {/* Platform components (Uptime Kuma) */}
        <GlassSurface variant='shell' className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span className='bg-chart-2/10 text-chart-2 flex size-7 items-center justify-center rounded-lg'>
              <Activity className='size-4' />
            </span>
            <h2 className='text-sm font-bold'>
              {t('healthPage.sections.components')}
            </h2>
          </div>
          {renderUptime()}
        </GlassSurface>

        {/* Cross links */}
        <div className='text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm'>
          <Link to='/market' className='text-primary hover:underline'>
            <Store className='mr-1 inline size-3.5' />
            {t('healthPage.links.market')}
          </Link>
          <span aria-hidden='true'>·</span>
          <Link to='/pricing' className='text-primary hover:underline'>
            {t('healthPage.links.pricing')}
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}
