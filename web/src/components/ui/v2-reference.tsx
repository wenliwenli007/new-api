/*
Copyright (C) 2026 LLM Commons contributors

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
*/
import * as React from 'react'

import { cn } from '@/lib/utils'

/* ───────────── ReferenceSystemCard ───────────── */
/**
 * 中国价镜 / 世界价镜双参照系说明卡。
 * 与生产方案 B（official_pricing.region = domestic | international）同构。
 */

function ReferenceSystemCard({
  region,
  title,
  description,
  icon,
  className,
}: {
  region: 'domestic' | 'international'
  title: string
  description: string
  icon: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot='reference-system-card'
      data-region={region}
      className={cn(
        'rounded-2xl border border-border/50 bg-card/40 p-4',
        className
      )}
    >
      <div className='mb-1.5 flex items-center gap-2'>
        <span
          className={cn(
            'flex size-5.5 items-center justify-center rounded-lg text-xs text-white',
            region === 'domestic' ? 'bg-primary' : 'bg-chart-2'
          )}
        >
          {icon}
        </span>
        <span className='text-sm font-bold'>{title}</span>
      </div>
      <p className='text-xs leading-relaxed text-muted-foreground'>
        {description}
      </p>
    </div>
  )
}

/* ───────────── MetricBar ───────────── */
/**
 * 路由指标条：将离散成功/失败序列渲染为竖条带 + 百分比。
 */

function MetricBar({
  label,
  bars,
  value,
  className,
}: {
  label: string
  bars: boolean[]
  value: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5 py-1.5', className)}>
      <span className='w-8 shrink-0 text-[11px] text-muted-foreground'>
        {label}
      </span>
      <span className='inline-flex flex-1 gap-0.5'>
        {bars.map((hit, i) => (
          <i
            key={i}
            className={cn(
              'h-3.5 flex-1 rounded-[3px]',
              hit ? 'bg-success' : 'bg-muted-foreground/15'
            )}
          />
        ))}
      </span>
      <span className='w-12 text-right text-xs font-bold tabular-nums text-success'>
        {value}
      </span>
    </div>
  )
}

/* ───────────── KVRow ───────────── */
/**
 * 键值对行：用于展开详情卡中的价格/来源字段。
 */

function KVRow({
  k,
  v,
  highlight,
  className,
}: {
  k: string
  v: React.ReactNode
  highlight?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-border/30 py-1.5 text-xs last:border-b-0',
        className
      )}
    >
      <span className='text-muted-foreground'>{k}</span>
      <span className={cn('font-semibold tabular-nums', highlight && 'text-primary')}>
        {v}
      </span>
    </div>
  )
}

export { ReferenceSystemCard, MetricBar, KVRow }
