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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GlassSurface } from '@/components/ui/v2-surfaces'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { getApiKeys } from '@/features/keys/api'
import { getUserLogs } from '@/features/usage-logs/api'
import { LOG_TYPE_ENUM } from '@/features/usage-logs/constants'
import type { UsageLog } from '@/features/usage-logs/data/schema'
import { getUserModels } from '@/lib/api'
import { formatNumber, formatQuota } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

function buildJsSnippet(baseUrl: string, model: string): string {
  return `import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'sk-...',
  baseURL: '${baseUrl}/v1',
})

const completion = await client.chat.completions.create({
  model: '${model}',
  messages: [{ role: 'user', content: 'Hello' }],
})

console.log(completion.choices[0].message.content)`
}

/** 控制台欢迎条 + 四统计卡 + 快速接入卡（对齐 prototype/llmcommons-ia/console.html）。
 *  数据：余额=auth.quota、本月消费/调用=/api/data/self 当月聚合、令牌数=/api/token、
 *  最近调用=/api/log/self 真实逐条计费日志、base_url=当前站点。 */
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

  // 本月消费与调用次数：/api/data/self 当月区间聚合（quota=消费额，count=调用次数）
  const monthStatsQuery = useQuery({
    queryKey: ['console', 'month-stats'],
    queryFn: async () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const r = await getUserQuotaDates({
        start_timestamp: Math.floor(start.getTime() / 1000),
        end_timestamp: Math.floor(now.getTime() / 1000),
      })
      return (r.data ?? []).reduce(
        (acc, d) => ({
          quota: acc.quota + (d.quota ?? 0),
          count: acc.count + (d.count ?? 0),
        }),
        { quota: 0, count: 0 }
      )
    },
    staleTime: 60 * 1000,
  })

  // 最近调用：真实逐条计费日志（/api/log/self，type=2 消费），一行=一次成功计费调用
  const recentCallsQuery = useQuery({
    queryKey: ['console', 'recent-calls'],
    queryFn: async () => {
      const r = await getUserLogs({
        p: 1,
        page_size: 5,
        type: LOG_TYPE_ENUM.CONSUME,
      })
      return r.success && r.data ? (r.data.items as UsageLog[]).slice(0, 5) : []
    },
    staleTime: 60 * 1000,
  })

  const modelsQuery = useQuery({
    queryKey: ['console', 'quick-connect-model'],
    queryFn: async () => {
      const r = await getUserModels()
      return r.success ? (r.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const recentCalls = useMemo(
    () => recentCallsQuery.data ?? [],
    [recentCallsQuery.data]
  )

  const quota = Number(user?.quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const monthStats = monthStatsQuery.data
  const monthUsed = monthStats?.quota ?? usedQuota
  const monthCalls = monthStats?.count ?? 0
  const tokenCount = keysQuery.data ?? 0
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://llmcommons.com'
  const sampleModel = modelsQuery.data?.[0] ?? 'gpt-4o-mini'
  const jsSnippet = useMemo(
    () => buildJsSnippet(baseUrl, sampleModel),
    [baseUrl, sampleModel]
  )

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

      {/* 四统计卡 */}
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='bg-card border-border rounded-2xl border p-5'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('当前余额')}
          </div>
          <div className='mt-2 text-2xl font-extrabold tabular-nums'>
            {formatQuota(quota)}
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
            {formatQuota(monthUsed)}
          </div>
          <div className='text-muted-foreground mt-2 text-xs'>
            {t('本月调用统计')}
          </div>
        </div>
        <div className='bg-card border-border rounded-2xl border p-5'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('本月调用次数')}
          </div>
          <div className='mt-2 text-2xl font-extrabold tabular-nums'>
            {formatNumber(monthCalls)}
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
            {formatNumber(tokenCount)}
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
              {t('最近 7 天的真实调用数据')}
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('时间')}</TableHead>
              <TableHead>{t('模型')}</TableHead>
              <TableHead className='text-right'>Tokens</TableHead>
              <TableHead className='text-right'>{t('调用')}</TableHead>
              <TableHead className='text-right'>{t('费用')}</TableHead>
              <TableHead className='text-right'>{t('状态')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
              const tokens =
                Number(call.prompt_tokens ?? 0) +
                Number(call.completion_tokens ?? 0)
              return (
                <TableRow key={call.id}>
                  <TableCell className='text-muted-foreground whitespace-nowrap'>
                    <span className='inline-flex items-center gap-1.5'>
                      <Clock3 className='size-3.5' />
                      {time}
                    </span>
                  </TableCell>
                  <TableCell className='font-mono text-xs font-medium'>
                    {call.model_name || '—'}
                  </TableCell>
                  <TableCell className='text-right font-mono text-xs tabular-nums'>
                    {tokens.toLocaleString()}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>1</TableCell>
                  <TableCell className='text-right font-mono text-xs tabular-nums'>
                    {formatQuota(Number(call.quota ?? 0))}
                  </TableCell>
                  <TableCell className='text-right'>
                    <span className='text-success inline-flex items-center gap-1 text-xs font-semibold'>
                      <CheckCircle2 className='size-3.5' />
                      {t('成功')}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
            {recentCalls.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='text-muted-foreground py-8 text-center'
                >
                  {recentCallsQuery.isLoading
                    ? t('加载中…')
                    : t('暂无调用记录')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 快速接入卡 */}
      <GlassSurface variant='shell' className='p-5'>
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center'>
          <div>
            <h3 className='text-base font-bold'>{t('快速接入')}</h3>
            <p className='text-muted-foreground mt-1.5 text-sm'>
              OpenAI 兼容格式，base_url 填{' '}
              <code className='bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-xs'>
                {baseUrl}
              </code>
              （不带 /v1），端点自动拼接 /v1/chat/completions。
            </p>
            <pre className='bg-muted/60 text-muted-foreground mt-3 overflow-x-auto rounded-xl border p-3 font-mono text-xs leading-relaxed'>
              {jsSnippet}
            </pre>
          </div>
          <div className='flex justify-start lg:justify-end'>
            <Button className='rounded-full' render={<Link to='/keys' />}>
              {t('创建 API 令牌')}
              <ArrowRight className='size-4' data-icon='inline-end' />
            </Button>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}
