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
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CircleDollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
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

export function CredentialCallRecords({ credentialId }: { credentialId: string }) {
  const { t } = useTranslation()
  const credsQuery = useQuery({
    queryKey: ['sharellm', 'credentials'],
    queryFn: () => sharellmApi.getCredentials(),
  })
  const logsQuery = useQuery({
    queryKey: ['sharellm', 'call-logs'],
    queryFn: () => sharellmApi.getCallLogs(),
  })

  const credential = credsQuery.data?.find((c) => String(c.id) === credentialId)

  return (
    <div className='space-y-6'>
      <Link
        to='/dashboard/credentials/$credentialId'
        params={{ credentialId }}
        className='text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline'
      >
        <ArrowLeft className='size-4' />
        {credential?.name ?? credentialId}
      </Link>

      <h1 className='text-2xl font-bold tracking-tight'>
        {t('sharellm.records.title', '凭据调用记录')}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>
            {t('sharellm.records.subtitle', '每次调用的消费者扣费与贡献者收入（双边记账）')}
          </CardTitle>
        </CardHeader>
        <CardContent className='px-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sharellm.logs.col.time', '时间')}</TableHead>
                  <TableHead>{t('sharellm.logs.col.model', '模型')}</TableHead>
                  <TableHead>{t('sharellm.logs.col.tokens', 'Tokens')}</TableHead>
                  <TableHead>{t('sharellm.logs.col.status', '状态')}</TableHead>
                  <TableHead>{t('sharellm.records.col.cost', '消费者扣费')}</TableHead>
                  <TableHead className='text-right'>
                    {t('sharellm.records.col.earning', '贡献者收入')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className='h-4 w-16' />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!logsQuery.isLoading &&
                  (logsQuery.data?.items ?? [])
                    .filter((l) => l.status === 'success')
                    .map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className='text-muted-foreground'>{l.time}</TableCell>
                        <TableCell className='font-medium'>{l.model}</TableCell>
                        <TableCell className='tabular'>{l.tokens}</TableCell>
                        <TableCell>
                          <Badge variant='secondary' className='bg-green-500/10 text-green-600'>
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className='tabular'>{l.consumerCost ?? '—'}</TableCell>
                        <TableCell className='text-green-600 tabular text-right'>
                          <CircleDollarSign className='mr-1 inline size-3' />
                          {l.consumerCost ?? '—'}
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
          'sharellm.records.note',
          '原型说明：收入列复用扣费数据模拟双边入账；真实实现由 ledger_entry 保证消费者扣费、贡献者收入与平台佣金同条入账。'
        )}
      </p>
    </div>
  )
}
