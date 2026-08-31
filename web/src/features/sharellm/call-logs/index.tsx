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
import { FileClock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { sharellmApi } from '@/features/sharellm/api/client'

export function CallLogs() {
  const { t } = useTranslation()
  const [routeFilter, setRouteFilter] = useState('all')

  const logsQuery = useQuery({
    queryKey: ['sharellm', 'call-logs'],
    queryFn: () => sharellmApi.getCallLogs(),
  })

  const routes = useQuery({
    queryKey: ['sharellm', 'routes'],
    queryFn: () => sharellmApi.getRoutes(),
  })

  const items = (logsQuery.data?.items ?? []).filter(
    (l) => routeFilter === 'all' || l.routeName === routeFilter
  )

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
            <FileClock className='text-primary size-6' />
            {t('sharellm.logs.title', '调用记录')}
          </h1>
          <CardDescription className='mt-1'>
            {t('sharellm.logs.subtitle', '按路由/模型/时间查看调用明细。')}
          </CardDescription>
        </div>
        <Select value={routeFilter} onValueChange={(v) => setRouteFilter(v ?? 'all')}>
          <SelectTrigger className='w-44'>
            <SelectValue placeholder='Route' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>
              {t('sharellm.logs.allRoutes', '全部路由')}
            </SelectItem>
            {(routes.data ?? []).map((r) => (
              <SelectItem key={r.id} value={r.name}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>
            {t('sharellm.logs.recent', '最近调用')}
          </CardTitle>
        </CardHeader>
        <CardContent className='px-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sharellm.logs.col.time', '时间')}</TableHead>
                  <TableHead>{t('sharellm.logs.col.model', '模型')}</TableHead>
                  <TableHead>{t('sharellm.logs.col.route', '路由')}</TableHead>
                  <TableHead>{t('sharellm.logs.col.tokens', 'Tokens')}</TableHead>
                  <TableHead>{t('sharellm.logs.col.latency', '延迟')}</TableHead>
                  <TableHead>{t('sharellm.logs.col.status', '状态')}</TableHead>
                  <TableHead className='text-right'>
                    {t('sharellm.logs.col.cost', '费用')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.isLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className='h-4 w-16' />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!logsQuery.isLoading &&
                  items.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className='text-muted-foreground'>{l.time}</TableCell>
                      <TableCell className='font-medium'>{l.model}</TableCell>
                      <TableCell>{l.routeName ?? '—'}</TableCell>
                      <TableCell className='tabular'>{l.tokens}</TableCell>
                      <TableCell className='tabular'>{l.latency ?? '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant='secondary'
                          className={
                            l.status === 'success'
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-red-500/10 text-red-600'
                          }
                        >
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='tabular text-right'>
                        {l.consumerCost ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                {!logsQuery.isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <p className='text-muted-foreground py-6 text-center text-sm'>
                        {t('sharellm.logs.empty', '暂无调用记录')}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
