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
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Pause, Play, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
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

import { sharellmApi } from '@/features/sharellm/api/client'

export function CredentialDetail({ credentialId }: { credentialId: string }) {
  const { t } = useTranslation()
  const credsQuery = useQuery({
    queryKey: ['sharellm', 'credentials'],
    queryFn: () => sharellmApi.getCredentials(),
  })

  const probeMutation = useMutation({
    mutationFn: () => sharellmApi.probeCredential(Number(credentialId)),
  })
  const [probeNote, setProbeNote] = useState<string | null>(null)

  const credential = credsQuery.data?.find(
    (c) => String(c.id) === credentialId
  )

  function runProbe() {
    probeMutation.mutate()
    setProbeNote(
      t('sharellm.credDetail.probeDone', '探测已完成（原型为模拟结果）')
    )
  }

  return (
    <div className='space-y-6'>
      <Link
        to='/dashboard/credentials'
        className='text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline'
      >
        <ArrowLeft className='size-4' />
        {t('sharellm.credDetail.back', '返回凭据列表')}
      </Link>

      <Card>
        <CardContent className='flex flex-wrap items-center justify-between gap-4 py-6'>
          <div>
            <h1 className='text-xl font-bold tracking-tight'>
              {credential?.name ?? <Skeleton className='h-6 w-32' />}
            </h1>
            <div className='mt-2 flex items-center gap-3'>
              <span className='font-mono text-xs'>{credential?.keyMask ?? '—'}</span>
              {credential && (
                <Badge
                  variant='secondary'
                  className={
                    credential.status === 'active'
                      ? 'bg-green-500/10 text-green-600'
                      : credential.status === 'paused'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-red-500/10 text-red-600'
                  }
                >
                  {credential.status}
                </Badge>
              )}
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' size='sm' onClick={runProbe} disabled={probeMutation.isPending}>
              {t('sharellm.credDetail.probe', '立即探测')}
            </Button>
            <Button variant='outline' size='sm'>
              <Pause className='size-4' />
              {t('sharellm.credDetail.pause', '暂停')}
            </Button>
            <Button variant='outline' size='sm' className='text-destructive'>
              <ShieldAlert className='size-4' />
              {t('sharellm.credDetail.revoke', '撤销')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {probeNote && (
        <p className='text-muted-foreground text-sm'>{probeNote}</p>
      )}

      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              {t('sharellm.credDetail.success', '成功率')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{credential?.successRate ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              {t('sharellm.credDetail.latency', '延迟')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{credential?.latency ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              {t('sharellm.credDetail.cacheHit', '缓存命中')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{credential?.cacheHitRate ?? '—'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>
            {t('sharellm.credDetail.models', '模型范围')}
          </CardTitle>
        </CardHeader>
        <CardContent className='font-mono text-xs'>
          {credential?.models.join(', ') ?? '—'}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex-row items-center justify-between'>
          <CardTitle className='text-base'>
            {t('sharellm.credDetail.records', '最近调用')}
          </CardTitle>
          <Button
            variant='ghost'
            size='sm'
            render={
              <Link
                to='/dashboard/credentials/$credentialId/call-records'
                params={{ credentialId }}
              />
            }
          >
            {t('sharellm.credDetail.allRecords', '全部 →')}
          </Button>
        </CardHeader>
        <CardContent className='px-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sharellm.logs.col.time', '时间')}</TableHead>
                <TableHead>{t('sharellm.logs.col.model', '模型')}</TableHead>
                <TableHead>{t('sharellm.logs.col.tokens', 'Tokens')}</TableHead>
                <TableHead>{t('sharellm.logs.col.status', '状态')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className='text-muted-foreground'>2026-09-01 10:12</TableCell>
                <TableCell className='font-medium'>gpt-5.6-luna</TableCell>
                <TableCell className='tabular'>8.2K</TableCell>
                <TableCell>
                  <Badge variant='secondary' className='bg-green-500/10 text-green-600'>
                    success
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className='text-muted-foreground'>2026-09-01 10:02</TableCell>
                <TableCell className='font-medium'>gpt-5.4-mini</TableCell>
                <TableCell className='tabular'>3.1K</TableCell>
                <TableCell>
                  <Badge variant='secondary' className='bg-green-500/10 text-green-600'>
                    success
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {credential?.status !== 'revoked' && (
        <p className='text-muted-foreground/70 flex items-center gap-1 text-xs'>
          <Play className='size-3' />
          {t(
            'sharellm.credDetail.note',
            '暂停/撤销为原型占位：真实实现需后端二次确认与审计日志。'
          )}
        </p>
      )}
    </div>
  )
}
