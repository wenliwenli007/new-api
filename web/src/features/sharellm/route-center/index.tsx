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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Route as RouteIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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

export function RouteCenter() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const routesQuery = useQuery({
    queryKey: ['sharellm', 'routes'],
    queryFn: () => sharellmApi.getRoutes(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sharellmApi.deleteRoute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sharellm', 'routes'] }),
  })

  // Add-route wizard state (prototype: single-step mock form)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [model, setModel] = useState('deepseek-v4-flash')
  const [priority, setPriority] = useState(1)
  const [failover, setFailover] = useState(true)

  const createMutation = useMutation({
    mutationFn: () =>
      sharellmApi.createRoute({
        name: name || `route-${Date.now()}`,
        model,
        offerId: 0,
        priority,
        failover,
      }),
    onSuccess: () => {
      setOpen(false)
      setName('')
      qc.invalidateQueries({ queryKey: ['sharellm', 'routes'] })
    },
  })

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
            <RouteIcon className='text-primary size-6' />
            {t('sharellm.route.title', '路由中心')}
          </h1>
          <CardDescription className='mt-1'>
            {t(
              'sharellm.route.subtitle',
              '组合模型与贡献者报价，生成统一调用 Key。'
            )}
          </CardDescription>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => routesQuery.refetch()}>
            <RefreshCw className='size-4' />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size='sm' onClick={() => setOpen(true)}>
              <Plus className='size-4' />
              {t('sharellm.route.new', '新增路由')}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t('sharellm.route.wizardTitle', '新增路由向导')}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    'sharellm.route.wizardDesc',
                    '选模型 → 选报价 → 优先级/失败转移 → 生成 Key（原型为简化表单）。'
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-3'>
                <Input
                  placeholder={t('sharellm.route.namePlaceholder', '路由名称')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  placeholder={t('sharellm.route.modelPlaceholder', '模型，如 deepseek-v4-flash')}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
                <div className='flex items-center gap-4'>
                  <label className='text-muted-foreground flex items-center gap-2 text-sm'>
                    {t('sharellm.route.priority', '优先级')}
                    <Input
                      type='number'
                      className='w-20'
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value) || 1)}
                    />
                  </label>
                  <label className='text-muted-foreground flex items-center gap-2 text-sm'>
                    <input
                      type='checkbox'
                      checked={failover}
                      onChange={(e) => setFailover(e.target.checked)}
                    />
                    {t('sharellm.route.failover', '失败转移')}
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  {t('sharellm.route.generateKey', '生成 Key')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className='px-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sharellm.route.col.name', '名称')}</TableHead>
                  <TableHead>{t('sharellm.route.col.models', '模型')}</TableHead>
                  <TableHead>{t('sharellm.route.col.contributor', '贡献者')}</TableHead>
                  <TableHead>{t('sharellm.route.col.priority', '优先级')}</TableHead>
                  <TableHead>{t('sharellm.route.col.failover', '失败转移')}</TableHead>
                  <TableHead>{t('sharellm.route.col.status', '状态')}</TableHead>
                  <TableHead>{t('sharellm.route.col.key', '调用 Key')}</TableHead>
                  <TableHead>{t('sharellm.route.col.last', '最近调用')}</TableHead>
                  <TableHead className='text-right'>
                    {t('sharellm.route.col.action', '操作')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routesQuery.isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className='h-4 w-16' />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {routesQuery.data?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className='font-medium'>{r.name}</TableCell>
                    <TableCell className='text-sm'>
                      {r.items.map((i) => i.model).join(', ')}
                    </TableCell>
                    <TableCell className='text-sm'>
                      {r.items.map((i) => i.contributor).join(', ')}
                    </TableCell>
                    <TableCell className='tabular'>
                      {r.items.map((i) => i.priority).join(' / ')}
                    </TableCell>
                    <TableCell>
                      {r.failover ? (
                        <Badge variant='secondary' className='bg-green-500/10 text-green-600'>
                          ON
                        </Badge>
                      ) : (
                        <Badge variant='secondary'>OFF</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='secondary'
                        className={
                          r.status === 'active'
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='font-mono text-xs'>{r.tokenKeyMask ?? '—'}</TableCell>
                    <TableCell className='text-muted-foreground text-sm'>{r.lastCallAt ?? '—'}</TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-destructive'
                        onClick={() => deleteMutation.mutate(r.id)}
                      >
                        {t('sharellm.route.delete', '删除')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!routesQuery.isLoading && (routesQuery.data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <p className='text-muted-foreground py-6 text-center text-sm'>
                        {t('sharellm.route.empty', '还没有路由，点击"新增路由"创建。')}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>
            {t('sharellm.route.wizardTitle', '新增路由向导')}
          </CardTitle>
        </CardHeader>
        <CardContent className='text-muted-foreground text-sm'>
          {t(
            'sharellm.route.stepsNote',
            '完整四步向导（选模型 → 选贡献者报价 → 优先级/失败转移 → 生成 Key）在原型阶段以上方简化表单代替，字段契约已按详细设计冻结。'
          )}
        </CardContent>
      </Card>
    </div>
  )
}
