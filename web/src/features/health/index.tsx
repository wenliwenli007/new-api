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
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { HeartPulse, RefreshCw, Store } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { sharellmApi } from '@/features/sharellm/api/client'

type HealthChannel = {
  id: number
  name: string
  status: string
  /** Probe latency in seconds; optional depending on the probe run. */
  time?: number
}

type HealthPayload = {
  /** Unix timestamp (seconds) of the latest probe run. */
  updated?: number
  channels?: HealthChannel[]
}

const STATUS_OK = new Set(['ok', 'healthy', 'up', 'active', 'online'])
const STATUS_DEGRADED = new Set(['degraded', 'warn', 'warning', 'slow'])
const STATUS_DOWN = new Set(['down', 'error', 'fail', 'failed', 'offline'])

function statusKind(status: string): 'ok' | 'degraded' | 'down' | 'unknown' {
  const normalized = status.trim().toLowerCase()
  if (STATUS_OK.has(normalized)) return 'ok'
  if (STATUS_DEGRADED.has(normalized)) return 'degraded'
  if (STATUS_DOWN.has(normalized)) return 'down'
  return 'unknown'
}

const STATUS_DOT_CLASS: Record<string, string> = {
  ok: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
  unknown: 'bg-muted-foreground/40',
}

const STATUS_VARIANT: Record<string, 'secondary' | 'warning' | 'destructive' | 'outline'> = {
  ok: 'secondary',
  degraded: 'warning',
  down: 'destructive',
  unknown: 'outline',
}

const SKELETON_CARDS = ['card-a', 'card-b']

function fetchHealth(): Promise<HealthPayload> {
  // Prototype: serve mock health data through the sharellm adapter instead of
  // the /health.json static file, which the repo does not provide (SRS FR-4).
  // Swap to the real backend endpoint once /api/sharellm/health lands.
  return sharellmApi.getHealth().then((h) => ({
    updated: Math.floor(Date.now() / 1000),
    channels: h.channels.map((c, i) => ({
      id: i + 1,
      name: c.name,
      status:
        c.status === 'ok' ? 'ok' : c.status === 'warn' ? 'degraded' : 'down',
      time: parseFloat(c.latency) || undefined,
    })),
  }))
}

export function ChannelHealth() {
  const { t } = useTranslation()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['channel-health'],
    queryFn: fetchHealth,
    staleTime: 60 * 1000,
  })

  const channels = data?.channels ?? []
  const isEmpty = !isLoading && channels.length === 0
  const updatedAt = data?.updated ? dayjs.unix(data.updated) : null

  function renderChannelCards() {
    if (isLoading) {
      return (
        <div className='grid gap-4 sm:grid-cols-2'>
          {SKELETON_CARDS.map((card) => (
            <Card key={card}>
              <CardContent className='flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <Skeleton className='size-2.5 rounded-full' />
                  <Skeleton className='h-4 w-36' />
                </div>
                <Skeleton className='h-5 w-16' />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (isEmpty) {
      return (
        <Card>
          <CardContent className='text-muted-foreground flex flex-col items-center gap-3 py-10 text-center'>
            <p className='font-medium'>{t('healthPage.empty.title')}</p>
            <p className='text-sm'>{t('healthPage.empty.desc')}</p>
            <Button
              variant='outline'
              size='sm'
              className='mt-1'
              onClick={() => refetch()}
            >
              <RefreshCw className='size-4' />
              {t('healthPage.refresh')}
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className='grid gap-4 sm:grid-cols-2'>
        {channels.map((channel) => {
          const kind = statusKind(channel.status ?? '')
          return (
            <Card key={channel.id ?? channel.name}>
              <CardContent className='flex items-center justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-3'>
                  <span
                    className={cn(
                      'size-2.5 shrink-0 rounded-full',
                      STATUS_DOT_CLASS[kind]
                    )}
                    aria-hidden='true'
                  />
                  <div className='min-w-0'>
                    <div className='truncate font-mono text-sm font-medium'>
                      {channel.name}
                    </div>
                    <div className='text-muted-foreground/70 text-xs'>
                      #{channel.id}
                      {typeof channel.time === 'number' && (
                        <>
                          {' · '}
                          {t('healthPage.latency')} {channel.time}s
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[kind]}>
                  {t(`healthPage.status.${kind}`)}
                </Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-4xl space-y-8 py-8'>
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
          {updatedAt?.isValid() && (
            <p className='text-muted-foreground/70 text-xs'>
              {t('healthPage.updated', {
                time: updatedAt.format('YYYY-MM-DD HH:mm:ss'),
              })}
            </p>
          )}
        </div>

        {/* Channel cards */}
        {renderChannelCards()}

        {/* Notes & cross links */}
        <div className='space-y-3 text-center'>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            {t('healthPage.failoverNote')}
          </p>
          <div className='text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm'>
            <a
              href='/health.json'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {t('healthPage.rawData')}
            </a>
            <span aria-hidden='true'>·</span>
            <Link to='/market' className='text-primary hover:underline'>
              <Store className='mr-1 inline size-3.5' />
              {t('healthPage.links.market')}
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
