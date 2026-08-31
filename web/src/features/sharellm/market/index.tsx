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
import { RefreshCw, Search, ShieldCheck, Store } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { useAuthStore } from '@/stores/auth-store'

import { sharellmApi } from '@/features/sharellm/api/client'
import type {
  MarketListing,
  MarketListFilters,
} from '@/features/sharellm/types/market'

type SortKey = NonNullable<MarketListFilters['sort']>

const SKELETON_ROWS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']

function PriceTag({ value }: { value: string }) {
  return <span className='font-medium tabular-nums'>{value}</span>
}

function tagBadge(tag: string) {
  const variant =
    tag === 'Free of charge'
      ? 'bg-green-500/10 text-green-600'
      : tag === 'Fast'
        ? 'bg-blue-500/10 text-blue-600'
        : tag === 'Low Price'
          ? 'bg-amber-500/10 text-amber-600'
          : 'bg-primary/10 text-primary'
  return (
    <Badge variant='secondary' className={variant}>
      {tag}
    </Badge>
  )
}

export function ModelMarket() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const isAuthed = !!auth.user

  const [listings, setListings] = useState<MarketListing[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState<string | null>(null)
  const [modelChip, setModelChip] = useState<string | null>(null)
  const [billing, setBilling] = useState<string>('all')
  const [sort, setSort] = useState<SortKey | 'default'>('default')
  const [freeOnly, setFreeOnly] = useState(false)

  async function load(filters: MarketListFilters) {
    setIsLoading(true)
    setLoadFailed(false)
    try {
      const res = await sharellmApi.getMarketList(filters)
      setListings(res.items)
      setTotal(res.total)
    } catch {
      setLoadFailed(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load({
      q: search || undefined,
      brand: brand ?? undefined,
      model: modelChip ?? undefined,
      billing: billing !== 'all' ? (billing as MarketListFilters['billing']) : undefined,
      freeOnly,
      sort: sort !== 'default' ? sort : undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, brand, modelChip, billing, sort, freeOnly])

  const brands = useMemo(
    () => Array.from(new Set(listings.map((l) => l.vendor).filter(Boolean))) as string[],
    [listings]
  )
  const modelNames = useMemo(
    () => Array.from(new Set(listings.map((l) => l.model))),
    [listings]
  )

  const addToRoute = (target: string) =>
    isAuthed ? target : `/sign-in?redirect=${encodeURIComponent(target)}`

  function renderBody() {
    if (isLoading) {
      return SKELETON_ROWS.map((row) => (
        <TableRow key={row}>
          {Array.from({ length: 9 }).map((_, i) => (
            <TableCell key={i}>
              <Skeleton className='h-4 w-20' />
            </TableCell>
          ))}
        </TableRow>
      ))
    }
    if (loadFailed) {
      return (
        <TableRow>
          <TableCell colSpan={9}>
            <div className='text-muted-foreground space-y-2 py-6 text-center text-sm'>
              <p>{t('sharellm.market.loadFailed', '数据加载失败，请重试')}</p>
              <Button variant='outline' size='sm' onClick={() => load({})}>
                <RefreshCw className='size-4' />
                {t('sharellm.market.retry', '重试')}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )
    }
    if (listings.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={9}>
            <p className='text-muted-foreground py-6 text-center text-sm'>
              {t('sharellm.market.empty', '暂无匹配的模型')}
            </p>
          </TableCell>
        </TableRow>
      )
    }
    return listings.map((l) => (
      <TableRow key={`${l.id}-${l.bestOffer.id}`}>
        <TableCell>
          <Link
            to='/pricing/$modelId'
            params={{ modelId: l.model }}
            className='text-primary font-medium hover:underline'
          >
            {l.model}
          </Link>
          {l.vendor && (
            <div className='text-muted-foreground/70 text-xs'>{l.vendor}</div>
          )}
        </TableCell>
        <TableCell className='text-sm'>{l.bestOffer.contributor}</TableCell>
        <TableCell className='tabular'>
          <PriceTag value={l.bestOffer.inputPrice} />
        </TableCell>
        <TableCell className='tabular'>{l.bestOffer.cachePrice}</TableCell>
        <TableCell className='tabular'>
          <PriceTag value={l.bestOffer.outputPrice} />
        </TableCell>
        <TableCell className='text-muted-foreground tabular'>
          {l.bestOffer.multiplier}
        </TableCell>
        <TableCell className='tabular'>
          <span className='font-medium text-green-600'>
            {l.bestOffer.successRate}
          </span>
        </TableCell>
        <TableCell>
          <div className='flex flex-wrap gap-1'>
            {l.tags.map((tg) => (
              <span key={tg}>{tagBadge(tg)}</span>
            ))}
          </div>
        </TableCell>
        <TableCell className='text-right'>
          <Button variant='outline' size='sm' render={<Link to={addToRoute('/route-center')} />}>
            {t('sharellm.market.addToRoute', '添加到路由')}
          </Button>
        </TableCell>
      </TableRow>
    ))
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-6xl space-y-6 py-8'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h1 className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
              <Store className='text-primary size-6' />
              {t('sharellm.market.title', '模型市场')}
            </h1>
            <CardDescription className='mt-1'>
              {t(
                'sharellm.market.subtitle',
                '发现经过验证的共享模型，创建 Key 并管理余额。'
              )}
            </CardDescription>
          </div>
          <Badge variant='secondary' className='gap-1'>
            <ShieldCheck className='size-3' />
            {t('sharellm.market.verified', '100% 官方认证')}
          </Badge>
        </div>

        {/* Quick select chips */}
        <div className='space-y-2'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('sharellm.market.brands', '品牌快捷筛选')}
          </div>
          <div className='flex flex-wrap gap-2'>
            {brands.map((b) => (
              <button
                key={b}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  brand === b
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:border-primary/40 text-muted-foreground'
                }`}
                onClick={() => setBrand(brand === b ? null : b)}
              >
                {b}
              </button>
            ))}
          </div>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('sharellm.market.models', '模型快捷筛选')}
          </div>
          <div className='flex flex-wrap gap-2'>
            {modelNames.slice(0, 10).map((m) => (
              <button
                key={m}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  modelChip === m
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:border-primary/40 text-muted-foreground'
                }`}
                onClick={() => setModelChip(modelChip === m ? null : m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className='flex flex-wrap items-center gap-3'>
          <div className='relative min-w-56 flex-1'>
            <Search className='text-muted-foreground absolute top-2.5 left-2.5 size-4' />
            <Input
              className='pl-8'
              placeholder={t('sharellm.market.search', '搜索模型')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={billing} onValueChange={(v) => setBilling(v ?? 'all')}>
            <SelectTrigger className='w-36'>
              <SelectValue placeholder='Billing' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>
                {t('sharellm.market.billing.all', '全部计费')}
              </SelectItem>
              <SelectItem value='token'>
                {t('sharellm.market.billing.token', '按 Token')}
              </SelectItem>
              <SelectItem value='request'>
                {t('sharellm.market.billing.request', '按请求')}
              </SelectItem>
              <SelectItem value='subscription'>
                {t('sharellm.market.billing.subscription', '订阅')}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort((v as SortKey | 'default') ?? 'default')}>
            <SelectTrigger className='w-36'>
              <SelectValue placeholder='Sort' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='default'>
                {t('sharellm.market.sort.default', '默认排序')}
              </SelectItem>
              <SelectItem value='price'>
                {t('sharellm.market.sort.price', '价格')}
              </SelectItem>
              <SelectItem value='success'>
                {t('sharellm.market.sort.success', '成功率')}
              </SelectItem>
              <SelectItem value='latency'>
                {t('sharellm.market.sort.latency', '延迟')}
              </SelectItem>
              <SelectItem value='recent'>
                {t('sharellm.market.sort.recent', '最近成功')}
              </SelectItem>
            </SelectContent>
          </Select>
          <label className='text-muted-foreground flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
            />
            {t('sharellm.market.freeOnly', '仅免费')}
          </label>
        </div>

        {/* Listing table */}
        <Card>
          <CardContent className='px-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('sharellm.market.col.model', '模型')}</TableHead>
                    <TableHead>{t('sharellm.market.col.contributor', '贡献者')}</TableHead>
                    <TableHead>{t('sharellm.market.col.input', '输入')}</TableHead>
                    <TableHead>{t('sharellm.market.col.cache', '缓存')}</TableHead>
                    <TableHead>{t('sharellm.market.col.output', '输出')}</TableHead>
                    <TableHead>{t('sharellm.market.col.mult', '倍率')}</TableHead>
                    <TableHead>{t('sharellm.market.col.success', '成功率')}</TableHead>
                    <TableHead>{t('sharellm.market.col.tags', '标签')}</TableHead>
                    <TableHead className='text-right'>
                      {t('sharellm.market.col.action', '操作')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderBody()}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {total > listings.length && (
          <p className='text-muted-foreground text-center text-xs'>
            {t('sharellm.market.moreNote', '共 {{total}} 条，当前显示 {{shown}} 条（原型仅内置示例数据）', { total, shown: listings.length })}
          </p>
        )}

        <p className='text-muted-foreground/70 text-xs leading-relaxed'>
          {t(
            'sharellm.market.note',
            '价格为人民币口径（元/百万 tokens，按请求计费的模型除外）；倍率基于官方价格折算。'
          )}
        </p>
      </div>
    </PublicLayout>
  )
}
