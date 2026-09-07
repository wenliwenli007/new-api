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
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  KeyRound,
  Wallet,
} from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { GlassSurface } from '@/components/ui/v2-surfaces'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { getApiKeys } from '@/features/keys/api'
import { useAuthStore } from '@/stores/auth-store'

/** 控制台欢迎条 + 三统计卡 + 快速接入卡（对齐 prototype/llmcommons-ia/console.html）。
 *  数据：余额=auth.quota、本月消费=used_quota、令牌数=/api/token、base_url=当前站点。 */
export function ConsoleWelcome() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)
  const username = user?.username ?? ''

  const keysQuery = useQuery({
    queryKey: ['console', 'keys-count'],
    queryFn: async () => {
      const r = await getApiKeys({ p: 1, size: 1 })
      return r.success ? (r.data?.total ?? r.data?.items?.length ?? 0) : 0
    },
    staleTime: 60 * 1000,
  })

  // 本月消费：/api/data/self 当月区间聚合（quota 字段=消费额）
  const monthQuotaQuery = useQuery({
    queryKey: ['console', 'month-quota'],
    queryFn: async () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const r = await getUserQuotaDates({
        start_timestamp: Math.floor(start.getTime() / 1000),
        end_timestamp: Math.floor(now.getTime() / 1000),
      })
      const total = (r.data ?? []).reduce((s, d) => s + (d.quota ?? 0), 0)
      return total
    },
    staleTime: 60 * 1000,
  })

  const recentCallsQuery = useQuery({
    queryKey: ['console', 'recent-calls'],
    queryFn: async () => {
      const end = new Date()
      const start = new Date(end)
      start.setDate(start.getDate() - 7)
      const r = await getUserQuotaDates({
        start_timestamp: Math.floor(start.getTime() / 1000),
        end_timestamp: Math.floor(end.getTime() / 1000),
        default_time: 'hour',
      })
      return (r.data ?? [])
        .filter((item) => item.model_name || item.count || item.quota)
        .sort((a, b) => Number(b.created_at) - Number(a.created_at))
        .slice(0, 5)
    },
    staleTime: 60 * 1000,
  })

  const recentCalls = useMemo(
    () => recentCallsQuery.data ?? [],
    [recentCallsQuery.data]
  )

  const quota = Number(user?.quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const monthUsed = monthQuotaQuery.data ?? usedQuota
  const tokenCount = keysQuery.data ?? 0
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://llmcommons.com'

  return (
    <div className='flex flex-col gap-4'>
      {/* 欢迎条 */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-2xl font-extrabold tracking-tight'>
            {t('控制台')}
          </h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('欢迎回来，{{name}}。查看余额、调用与接入状态。', {
              name: username,
            })}
          </p>
        </div>
        <span className='border-success/30 bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold'>
          ● {t('账户运行正常')}
        </span>
      </div>

      {/* 三统计卡 */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='bg-card border-border rounded-2xl border p-5'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('当前余额')}
          </div>
          <div className='mt-2 text-2xl font-extrabold tabular-nums'>
            ¥{(quota / 500000).toFixed(2)}
          </div>
          <Link to='/wallet' className='mt-3 inline-block'>
            <Button size='sm' className='h-8 rounded-full px-3 text-xs'>
              <Wallet className='size-3.5' data-icon='inline-start' />
              {t('充值 / 兑换码')}
            </Button>
          </Link>
        </div>
        <div className='bg-card border-border rounded-2xl border p-5'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('本月消费')}
          </div>
          <div className='mt-2 text-2xl font-extrabold tabular-nums'>
            ¥{(monthUsed / 500000).toFixed(2)}
          </div>
          <div className='text-muted-foreground mt-2 text-xs'>
            {t('本月调用统计')}
          </div>
        </div>
        <div className='bg-card border-border rounded-2xl border p-5'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('可用令牌')}
          </div>
          <div className='mt-2 text-2xl font-extrabold tabular-nums'>
            {tokenCount}
          </div>
          <Link to='/keys' className='mt-3 inline-block'>
            <Button
              size='sm'
              variant='outline'
              className='h-8 rounded-full px-3 text-xs'
            >
              <KeyRound className='size-3.5' data-icon='inline-start' />
              {t('管理令牌')}
            </Button>
          </Link>
        </div>
      </div>

      {/* 最近调用 */}
      <div className='bg-card border-border overflow-hidden rounded-2xl border'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4'>
          <div>
            <h3 className='flex items-center gap-2 text-base font-bold'>
              <FileText className='text-primary size-4' />
              {t('最近调用')}
            </h3>
            <p className='text-muted-foreground mt-1 text-xs'>
              {t('最近 7 天的真实调用聚合数据')}
            </p>
          </div>
          <Link
            to='/usage-logs'
            className='text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline'
          >
            {t('查看全部日志')}
            <ArrowRight className='size-3.5' />
          </Link>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[560px] text-sm'>
            <thead className='bg-muted/35 text-muted-foreground text-left text-xs'>
              <tr>
                <th className='px-5 py-3 font-medium'>{t('时间')}</th>
                <th className='px-5 py-3 font-medium'>{t('模型')}</th>
                <th className='px-5 py-3 text-right font-medium'>Tokens</th>
                <th className='px-5 py-3 text-right font-medium'>
                  {t('调用')}
                </th>
                <th className='px-5 py-3 text-right font-medium'>
                  {t('费用')}
                </th>
                <th className='px-5 py-3 text-right font-medium'>
                  {t('状态')}
                </th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {recentCalls.map((call) => {
                const timestamp = Number(call.created_at) * 1000
                const time = Number.isFinite(timestamp)
                  ? new Intl.DateTimeFormat(undefined, {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(timestamp))
                  : '—'
                const rowKey =
                  call.id ??
                  [
                    call.created_at,
                    call.model_name ?? 'aggregate',
                    call.token_used ?? 0,
                    call.count ?? 0,
                    call.quota ?? 0,
                  ].join('-')
                return (
                  <tr key={rowKey}>
                    <td className='text-muted-foreground px-5 py-3 whitespace-nowrap'>
                      <span className='inline-flex items-center gap-1.5'>
                        <Clock3 className='size-3.5' />
                        {time}
                      </span>
                    </td>
                    <td className='px-5 py-3 font-mono text-xs font-medium'>
                      {call.model_name || t('多个模型')}
                    </td>
                    <td className='px-5 py-3 text-right font-mono text-xs tabular-nums'>
                      {Number(call.token_used ?? 0).toLocaleString()}
                    </td>
                    <td className='px-5 py-3 text-right tabular-nums'>
                      {Number(call.count ?? 0).toLocaleString()}
                    </td>
                    <td className='px-5 py-3 text-right font-mono text-xs tabular-nums'>
                      ¥{(Number(call.quota ?? 0) / 500000).toFixed(2)}
                    </td>
                    <td className='px-5 py-3 text-right'>
                      <span className='text-success inline-flex items-center gap-1 text-xs font-semibold'>
                        <CheckCircle2 className='size-3.5' />
                        {t('成功')}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {recentCalls.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className='text-muted-foreground px-5 py-8 text-center text-sm'
                  >
                    {recentCallsQuery.isLoading
                      ? t('加载中…')
                      : t('暂无调用记录')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 快速接入卡 */}
      <GlassSurface variant='shell' className='p-5'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h3 className='text-base font-bold'>{t('快速接入')}</h3>
            <p className='text-muted-foreground mt-1.5 text-sm'>
              OpenAI 兼容格式，base_url 填{' '}
              <code className='bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-xs'>
                {baseUrl}
              </code>
              （不带 /v1），端点自动拼接 /v1/chat/completions。
            </p>
          </div>
          <Link to='/keys'>
            <Button className='rounded-full'>
              {t('创建 API 令牌')}
              <ArrowRight className='size-4' data-icon='inline-end' />
            </Button>
          </Link>
        </div>
      </GlassSurface>
    </div>
  )
}
