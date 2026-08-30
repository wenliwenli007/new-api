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

const CNY_PER_USD = 7.2
const DEFAULT_GROUP = 'default'

type ComputedPrices = {
  input: number
  output: number | null
  perRequest: boolean
}

/**
 * Unified CNY pricing basis (per million tokens):
 * input = model_ratio × 2 × 7.2, output = input × completion_ratio.
 * Per-request models are billed model_price × 7.2 per call.
 */
function computePrices(model: PricingModel): ComputedPrices {
  if (model.quota_type === QUOTA_TYPE_VALUES.REQUEST) {
    return {
      input: (model.model_price || 0) * CNY_PER_USD,
      output: null,
      perRequest: true,
    }
  }
  const input = (model.model_ratio || 0) * 2 * CNY_PER_USD
  return {
    input,
    output: input * (model.completion_ratio || 1),
    perRequest: false,
  }
}

function formatCny(value: number): string {
  if (!Number.isFinite(value)) return '-'
  const digits = value > 0 && value < 0.01 ? 4 : 2
  return `¥${value.toFixed(digits)}`
}

const SKELETON_ROWS = ['row-a', 'row-b', 'row-c']
const SKELETON_CELLS = ['model', 'input', 'output', 'mode', 'failover']

export function ModelMarket() {
  const { t } = useTranslation()
  const { models, isLoading, error, refetch } = usePricingData()

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
      const prices = computePrices(model)
      return (
        <TableRow key={model.model_name}>
          <TableCell>
            <div className='font-medium'>{model.model_name}</div>
            {model.vendor_name && (
              <div className='text-muted-foreground/70 text-xs'>
                {model.vendor_name}
              </div>
            )}
          </TableCell>
          <TableCell className='font-medium tabular-nums'>
            {formatCny(prices.input)}
            <span className='text-muted-foreground/60 ml-1 text-xs'>
              /{' '}
              {prices.perRequest
                ? t('marketPage.unit.request')
                : t('marketPage.unit.tokens')}
            </span>
          </TableCell>
          <TableCell className='font-medium tabular-nums'>
            {prices.output === null ? (
              <span className='text-muted-foreground'>—</span>
            ) : (
              formatCny(prices.output)
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
