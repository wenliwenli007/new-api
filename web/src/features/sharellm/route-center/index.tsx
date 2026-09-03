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
import {
  FlaskConical,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { GlassSurface } from '@/components/ui/v2-surfaces'
import { FilterChip } from '@/components/ui/v2-widgets'

import { sharellmApi } from '@/features/sharellm/api/client'
import type { ConsumerRoute } from '@/features/sharellm/types/route'

/**
 * 路由中心 — v2 管理员预览版。
 * 数据仍是 mock（sharellmApi USE_MOCK）；所有写操作控件禁用并附
 * “功能开发中” tooltip，仅供管理员预览信息架构与视觉。
 */

function DevPreviewTooltip(props: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className='inline-flex cursor-not-allowed' />}
      >
        {props.children}
      </TooltipTrigger>
      <TooltipContent className='text-xs'>
        {t('sharellm.route.devTooltip')}
      </TooltipContent>
    </Tooltip>
  )
}

function RouteStatusBadge(props: { status: ConsumerRoute['status'] }) {
  return (
    <Badge
      variant='secondary'
      className={
        props.status === 'active'
          ? 'bg-success/10 text-success'
          : 'bg-amber-500/10 text-amber-600'
      }
    >
      {props.status}
    </Badge>
  )
}

function RouteNodesTable(props: { route: ConsumerRoute }) {
  const { t } = useTranslation()
  const thClass =
    'text-muted-foreground text-[10px] font-medium tracking-wider uppercase'

  return (
    <div className='overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow className='hover:bg-transparent'>
            <TableHead className={thClass}>
              {t('sharellm.route.col.models')}
            </TableHead>
            <TableHead className={thClass}>
              {t('sharellm.route.col.contributor')}
            </TableHead>
            <TableHead className={thClass}>
              {t('sharellm.route.col.priority')}
            </TableHead>
            <TableHead className={thClass}>
              {t('sharellm.route.col.weight')}
            </TableHead>
            <TableHead className={thClass}>
              {t('sharellm.route.col.enabled')}
            </TableHead>
            <TableHead className={`${thClass} text-right`}>
              {t('sharellm.route.col.action')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.route.items.map((item) => (
            <TableRow key={item.id} className='hover:bg-muted/30'>
              <TableCell className='font-mono text-sm font-medium'>
                {item.model}
              </TableCell>
              <TableCell className='text-muted-foreground text-sm'>
                {item.contributor}
              </TableCell>
              <TableCell>
                <DevPreviewTooltip>
                  <Input
                    type='number'
                    value={item.priority}
                    disabled
                    readOnly
                    className='bg-card/60 h-8 w-20 tabular-nums'
                  />
                </DevPreviewTooltip>
              </TableCell>
              <TableCell>
                <DevPreviewTooltip>
                  <Input
                    type='number'
                    value={item.weight}
                    disabled
                    readOnly
                    className='bg-card/60 h-8 w-20 tabular-nums'
                  />
                </DevPreviewTooltip>
              </TableCell>
              <TableCell>
                <DevPreviewTooltip>
                  <Switch
                    checked={props.route.status === 'active'}
                    disabled
                    aria-label={t('sharellm.route.col.enabled')}
                  />
                </DevPreviewTooltip>
              </TableCell>
              <TableCell className='text-right'>
                <DevPreviewTooltip>
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled
                    className='text-destructive'
                  >
                    <Trash2 className='size-4' />
                    {t('sharellm.route.delete')}
                  </Button>
                </DevPreviewTooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function RouteCenter() {
  const { t } = useTranslation()

  const routesQuery = useQuery({
    queryKey: ['sharellm', 'routes'],
    queryFn: () => sharellmApi.getRoutes(),
  })

  const routes = useMemo(() => routesQuery.data ?? [], [routesQuery.data])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedRoute =
    routes.find((r) => r.id === selectedId) ?? routes[0] ?? null

  return (
    <TooltipProvider>
      <div className='space-y-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='flex flex-wrap items-center gap-2.5'>
              <h1 className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
                <RouteIcon className='text-primary size-6' />
                {t('sharellm.route.title')}
              </h1>
              <Badge
                variant='secondary'
                className='gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
              >
                <FlaskConical className='size-3' />
                {t('sharellm.route.previewBadge')}
              </Badge>
            </div>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t('sharellm.route.subtitle')}
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => routesQuery.refetch()}
            >
              <RefreshCw className='size-4' />
            </Button>
            <DevPreviewTooltip>
              <Button size='sm' disabled>
                <Plus className='size-4' />
                {t('sharellm.route.new')}
              </Button>
            </DevPreviewTooltip>
          </div>
        </div>

        {routesQuery.isLoading ? (
          <div className='flex flex-wrap gap-2.5'>
            {['first', 'second', 'third'].map((key) => (
              <Skeleton key={key} className='h-12 w-44 rounded-xl' />
            ))}
          </div>
        ) : routes.length === 0 ? (
          <GlassSurface variant='inset'>
            <p className='text-muted-foreground py-4 text-center text-sm'>
              {t('sharellm.route.empty')}
            </p>
          </GlassSurface>
        ) : (
          <div className='flex flex-wrap gap-2.5'>
            {routes.map((route) => (
              <FilterChip
                key={route.id}
                active={selectedRoute?.id === route.id}
                title={route.name}
                subtitle={t('sharellm.route.chipSubtitle', {
                  count: route.items.length,
                  status: route.status,
                })}
                onClick={() => setSelectedId(route.id)}
              />
            ))}
          </div>
        )}

        {selectedRoute && (
          <GlassSurface variant='card' className='space-y-4'>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
              <span className='font-mono text-sm font-bold'>
                {selectedRoute.name}
              </span>
              <RouteStatusBadge status={selectedRoute.status} />
              {selectedRoute.failover ? (
                <Badge
                  variant='secondary'
                  className='bg-success/10 text-success'
                >
                  {t('sharellm.route.failoverOn')}
                </Badge>
              ) : (
                <Badge variant='secondary'>
                  {t('sharellm.route.failoverOff')}
                </Badge>
              )}
              <span className='text-muted-foreground font-mono text-xs'>
                {selectedRoute.tokenKeyMask ?? '—'}
              </span>
              <span className='text-muted-foreground ml-auto text-xs'>
                {t('sharellm.route.col.last')}: {selectedRoute.lastCallAt ?? '—'}
              </span>
            </div>
            <RouteNodesTable route={selectedRoute} />
          </GlassSurface>
        )}

        <GlassSurface variant='inset'>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            {t('sharellm.route.previewNote')}
          </p>
        </GlassSurface>
      </div>
    </TooltipProvider>
  )
}
