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
import { KeyRound, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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

const statusClass: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600',
  paused: 'bg-amber-500/10 text-amber-600',
  revoked: 'bg-red-500/10 text-red-600',
}

export function Credentials() {
  const { t } = useTranslation()

  const credsQuery = useQuery({
    queryKey: ['sharellm', 'credentials'],
    queryFn: () => sharellmApi.getCredentials(),
  })

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
            <KeyRound className='text-primary size-6' />
            {t('sharellm.cred.title', '凭据管理')}
          </h1>
          <CardDescription className='mt-1'>
            {t(
              'sharellm.cred.subtitle',
              '凭据加密存储（AES-GCM），界面仅显示脱敏 Key。'
            )}
          </CardDescription>
        </div>
        <Button size='sm' disabled>
          <Plus className='size-4' />
          {t('sharellm.cred.add', '新增凭据')}
        </Button>
      </div>

      <Card>
        <CardContent className='px-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sharellm.cred.col.name', '名称')}</TableHead>
                  <TableHead>{t('sharellm.cred.col.type', '类型')}</TableHead>
                  <TableHead>{t('sharellm.cred.col.provider', '提供方')}</TableHead>
                  <TableHead>{t('sharellm.cred.col.models', '模型范围')}</TableHead>
                  <TableHead>{t('sharellm.cred.col.key', 'Key')}</TableHead>
                  <TableHead>{t('sharellm.cred.col.status', '状态')}</TableHead>
                  <TableHead>{t('sharellm.cred.col.probe', '成功率')}</TableHead>
                  <TableHead>{t('sharellm.cred.col.last', '最近调用')}</TableHead>
                  <TableHead className='text-right'>
                    {t('sharellm.cred.col.action', '操作')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credsQuery.isLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className='h-4 w-16' />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {credsQuery.data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className='font-medium'>{c.name}</TableCell>
                    <TableCell>{c.providerType}</TableCell>
                    <TableCell>{c.providerName}</TableCell>
                    <TableCell className='font-mono text-xs'>
                      {c.models.join(', ')}
                    </TableCell>
                    <TableCell className='font-mono text-xs'>{c.keyMask}</TableCell>
                    <TableCell>
                      <Badge variant='secondary' className={statusClass[c.status]}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='tabular'>{c.successRate ?? '—'}</TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {c.lastCallAt ?? '—'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='sm'
                        render={
                          <Link
                            to='/dashboard/credentials/$credentialId'
                            params={{ credentialId: String(c.id) }}
                          />
                        }
                      >
                        {t('sharellm.cred.detail', '详情')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!credsQuery.isLoading && (credsQuery.data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <p className='text-muted-foreground py-6 text-center text-sm'>
                        {t('sharellm.cred.empty', '还没有凭据')}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className='text-muted-foreground/70 text-xs'>
        {t(
          'sharellm.cred.securityNote',
          '安全约束：凭据明文永不出库；读取明文需超级管理员授权并记录审计；撤销操作需二次确认。'
        )}
      </p>
    </div>
  )
}
