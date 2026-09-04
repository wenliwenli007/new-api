/*
Copyright (C) 2026 LLM Commons contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { getUptimeStatus } from '@/features/dashboard/api'
import { api } from '@/lib/api'
import { usePricingData } from '@/features/pricing/hooks'
import { useOfficialPricing } from '@/features/channels/hooks/use-official-pricing'

import { GlassShell } from './dual-cards'

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className='text-center'>
      <div className='text-2xl font-extrabold tabular-nums'>{num}</div>
      <div className='text-muted-foreground mt-0.5 text-xs'>{label}</div>
    </div>
  )
}

type TodayStats = {
  today_calls: number
  today_tokens: number
  official_channels: number
}

// 公开今日聚合（v2 服务脉搏）：今日调用/Tokens/官方渠道数
async function getTodayStats(): Promise<TodayStats> {
  const res = await api.get('/api/stats/today')
  return res.data.data as TodayStats
}

/** v2 服务脉搏：今日调用/Tokens/官方渠道暂无公开接口，按创始人许可先显示 "—"，
 *  在售模型=/api/pricing 实数，官网价同步=official_pricing 快照条数，可用性=uptime。 */
export function Pulse() {
  const { t } = useTranslation()
  const pricingQuery = usePricingData()
  const { officialPricing } = useOfficialPricing()
  const statsQuery = useQuery({
    queryKey: ['stats-today'],
    queryFn: getTodayStats,
    staleTime: 60 * 1000,
    retry: false,
  })
  const uptimeQuery = useQuery({
    queryKey: ['uptime-status'],
    queryFn: getUptimeStatus,
    staleTime: 60 * 1000,
    retry: false,
  })

  const modelCount = pricingQuery.models?.length ?? null
  const officialCount = Object.keys(officialPricing || {}).length || null
  const stats = statsQuery.data
  const uptimeGroups = uptimeQuery.data?.data ?? []
  const monitors = uptimeGroups.flatMap((g) => g.monitors ?? [])
  const uptimeAvg = monitors.length
    ? monitors.reduce((sum, m) => sum + (m.uptime ?? 0), 0) / monitors.length
    : null

  const fmtTokens = (n: number | undefined): string => {
    if (n == null) return '—'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const statsList: Array<[string, string | null]> = [
    ['home.pulse.calls', stats ? String(stats.today_calls) : null],
    ['home.pulse.tokens', stats ? fmtTokens(stats.today_tokens) : null],
    ['home.pulse.models', modelCount == null ? null : String(modelCount)],
    [
      'home.pulse.channels',
      stats ? String(stats.official_channels) : null,
    ],
    [
      'home.pulse.sync',
      officialCount == null ? null : t('home.pulse.syncCount', { count: officialCount }),
    ],
    [
      'home.pulse.uptime',
      uptimeAvg == null ? null : `${(uptimeAvg * 100).toFixed(2)}%`,
    ],
  ]

  return (
    <GlassShell>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-lg font-extrabold'>{t('home.pulse.title')}</h2>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            {t('home.pulse.subtitle')}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='bg-card/85 hover:border-primary hover:text-primary rounded-full text-xs font-semibold'
          render={<Link to='/health' />}
        >
          {t('home.pulse.viewStatus')}
        </Button>
      </div>
      <div className='mt-5 flex flex-wrap justify-center gap-9 pb-1'>
        {statsList.map(([key, value]) => (
          <Stat key={key} num={value ?? '—'} label={t(key)} />
        ))}
      </div>
    </GlassShell>
  )
}
