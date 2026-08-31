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
import { BadgeCheck, HandCoins, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
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

import { sharellmApi } from '@/features/sharellm/api/client'

const batchStatusClass: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  settled: 'bg-green-500/10 text-green-600',
  withdrawn: 'bg-blue-500/10 text-blue-600',
}

export function Earnings() {
  const { t } = useTranslation()

  const earningsQuery = useQuery({
    queryKey: ['sharellm', 'earnings'],
    queryFn: () => sharellmApi.getEarnings(),
  })

  const data = earningsQuery.data

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
          <HandCoins className='text-primary size-6' />
          {t('sharellm.earnings.title', '收益与结算')}
        </h1>
        <CardDescription className='mt-1'>
          {t(
            'sharellm.earnings.subtitle',
            '每笔调用实时入账，7 天成熟期后进入可提现批次。'
          )}
        </CardDescription>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-sm font-medium text-muted-foreground'>
              <Wallet className='size-4' />
              {t('sharellm.earnings.total', '总收入')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <div className='text-2xl font-bold tabular-nums'>{data.total}</div>
            ) : (
              <Skeleton className='h-8 w-28' />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-sm font-medium text-muted-foreground'>
              <BadgeCheck className='size-4' />
              {t('sharellm.earnings.pending', '待结算')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <div className='text-2xl font-bold tabular-nums text-amber-600'>
                {data.pending}
              </div>
            ) : (
              <Skeleton className='h-8 w-24' />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              {t('sharellm.earnings.withdrawn', '已提现')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <div className='text-2xl font-bold tabular-nums'>{data.withdrawn}</div>
            ) : (
              <Skeleton className='h-8 w-28' />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>
            {t('sharellm.earnings.entries', '收入明细')}
          </CardTitle>
        </CardHeader>
        <CardContent className='px-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sharellm.earnings.col.date', '日期')}</TableHead>
                  <TableHead>{t('sharellm.earnings.col.model', '模型')}</TableHead>
                  <TableHead>{t('sharellm.earnings.col.calls', '调用次数')}</TableHead>
                  <TableHead>{t('sharellm.earnings.col.gross', '毛收入')}</TableHead>
                  <TableHead>{t('sharellm.earnings.col.fee', '平台佣金')}</TableHead>
                  <TableHead className='text-right'>
                    {t('sharellm.earnings.col.net', '净收入')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.entries ?? []).map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className='text-muted-foreground'>{e.date}</TableCell>
                    <TableCell className='font-medium'>{e.model}</TableCell>
                    <TableCell className='tabular'>{e.calls}</TableCell>
                    <TableCell className='tabular'>{e.gross}</TableCell>
                    <TableCell className='text-muted-foreground tabular'>{e.platformFee}</TableCell>
                    <TableCell className='text-green-600 tabular font-medium text-right'>
                      {e.net}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>
            {t('sharellm.earnings.batches', '结算批次')}
          </CardTitle>
        </CardHeader>
        <CardContent className='px-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sharellm.earnings.col.batch', '批次')}</TableHead>
                  <TableHead>{t('sharellm.earnings.col.amount', '金额')}</TableHead>
                  <TableHead>{t('sharellm.earnings.col.fee', '佣金')}</TableHead>
                  <TableHead>{t('sharellm.earnings.col.payout', '净打款')}</TableHead>
                  <TableHead>{t('sharellm.earnings.col.maturity', '到账日')}</TableHead>
                  <TableHead className='text-right'>
                    {t('sharellm.earnings.col.status', '状态')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.batches ?? []).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className='font-mono text-xs'>{b.id}</TableCell>
                    <TableCell className='tabular'>{b.amount}</TableCell>
                    <TableCell className='text-muted-foreground tabular'>{b.platformFee}</TableCell>
                    <TableCell className='tabular'>{b.netPayout}</TableCell>
                    <TableCell className='text-muted-foreground'>{b.maturityAt}</TableCell>
                    <TableCell className='text-right'>
                      <Badge variant='secondary' className={batchStatusClass[b.status]}>
                        {b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className='text-muted-foreground/70 text-xs'>
        {t(
          'sharellm.earnings.note',
          '财务一致性：金额展示为账本（ledger_entry）汇总，前端不做任何计算；退款通过冲销条目处理。原型数据为 mock。'
        )}
      </p>
    </div>
  )
}
