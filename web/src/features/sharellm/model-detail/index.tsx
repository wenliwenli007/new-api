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
import { ArrowLeft, ShieldCheck, Store, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/stores/auth-store'

import { sharellmApi } from '@/features/sharellm/api/client'
import type { ModelDetail } from '@/features/sharellm/types/market'

export function ModelDetailPage({ modelId }: { modelId: string }) {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const isAuthed = !!auth.user

  const [detail, setDetail] = useState<ModelDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setLoadFailed(false)
    sharellmApi
      .getModelDetail(modelId)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [modelId])

  const routeTarget = isAuthed
    ? '/route-center'
    : `/sign-in?redirect=${encodeURIComponent('/route-center')}`

  return (
    <PublicLayout>
      <div className='mx-auto max-w-5xl space-y-6 py-8'>
        <Link
          to='/market'
          className='text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline'
        >
          <ArrowLeft className='size-4' />
          {t('sharellm.model.back', '返回市场')}
        </Link>

        {/* Hero */}
        <Card>
          <CardContent className='flex items-center gap-4 py-6'>
            <div className='bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl text-xl font-bold'>
              {modelId.charAt(0).toUpperCase()}
            </div>
            <div className='min-w-0'>
              <h1 className='truncate text-2xl font-bold tracking-tight'>
                {modelId}
              </h1>
              {detail && (
                <div className='mt-2 flex flex-wrap gap-1'>
                  {detail.tags.map((tg) => (
                    <Badge key={tg} variant='secondary'>
                      {tg}
                    </Badge>
                  ))}
                  {detail.verified && (
                    <Badge variant='secondary' className='gap-1 bg-green-500/10 text-green-600'>
                      <ShieldCheck className='size-3' />
                      {t('sharellm.model.verified', '认证池背书')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Offers table */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Store className='size-4' />
              {t('sharellm.model.offers', '贡献者报价')}
            </CardTitle>
          </CardHeader>
          <CardContent className='px-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('sharellm.model.col.contributor', '贡献者')}</TableHead>
                    <TableHead>{t('sharellm.model.col.input', '输入')}</TableHead>
                    <TableHead>{t('sharellm.model.col.cache', '缓存')}</TableHead>
                    <TableHead>{t('sharellm.model.col.output', '输出')}</TableHead>
                    <TableHead>{t('sharellm.model.col.mult', '倍率')}</TableHead>
                    <TableHead>{t('sharellm.model.col.success', '成功率')}</TableHead>
                    <TableHead>{t('sharellm.model.col.latency', '延迟')}</TableHead>
                    <TableHead>{t('sharellm.model.col.cacheHit', '缓存命中')}</TableHead>
                    <TableHead>{t('sharellm.model.col.last', '最近成功')}</TableHead>
                    <TableHead className='text-right'>
                      {t('sharellm.model.col.action', '操作')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 11 }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className='h-4 w-16' />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : (detail?.offers ?? []).map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className='font-medium'>{o.contributor}</TableCell>
                          <TableCell className='tabular'>{o.inputPrice}</TableCell>
                          <TableCell className='tabular'>{o.cachePrice}</TableCell>
                          <TableCell className='tabular'>{o.outputPrice}</TableCell>
                          <TableCell className='text-muted-foreground tabular'>{o.multiplier}</TableCell>
                          <TableCell className='tabular font-medium text-green-600'>{o.successRate}</TableCell>
                          <TableCell className='tabular'>{o.latency}</TableCell>
                          <TableCell className='tabular'>{o.cacheHitRate}</TableCell>
                          <TableCell className='text-muted-foreground'>{o.lastSuccessAt}</TableCell>
                          <TableCell className='text-right'>
                            <Button variant='outline' size='sm' render={<a href={routeTarget} />}>
                              {t('sharellm.model.add', '添加')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoading && !loadFailed && (detail?.offers.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={11}>
                        <p className='text-muted-foreground py-6 text-center text-sm'>
                          {t('sharellm.model.noOffers', '该模型暂无可用报价')}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                  {loadFailed && (
                    <TableRow>
                      <TableCell colSpan={11}>
                        <p className='text-muted-foreground py-6 text-center text-sm'>
                          {t('sharellm.model.loadFailed', '详情加载失败，请返回市场重试')}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Quality summary */}
        {detail && (
          <Card>
            <CardHeader>
              <CardTitle>{t('sharellm.model.quality', '质量与验证')}</CardTitle>
            </CardHeader>
            <CardContent className='text-muted-foreground space-y-1 text-sm'>
              <p>
                {t('sharellm.model.priceNote', '计费说明')}：{detail.priceNote}
              </p>
              <p>
                {t('sharellm.model.lastProbe', '最近探测')}：{detail.lastProbedAt}
              </p>
              {detail.rating !== undefined && (
                <p>
                  {t('sharellm.model.reviews', '评价')}：★ {detail.rating} ({detail.reviewCount})
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className='flex flex-wrap gap-3 pb-8'>
          <Button render={<a href={routeTarget} />}>
            {t('sharellm.model.addToRoute', '加入路由（消费者）')}
          </Button>
          <Button variant='outline' render={<Link to='/contributor' />}>
            <UserPlus className='size-4' />
            {t('sharellm.model.becomeContributor', '申请成为贡献者')}
          </Button>
        </div>
      </div>
    </PublicLayout>
  )
}
