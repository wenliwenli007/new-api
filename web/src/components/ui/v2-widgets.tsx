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

/* ───────────── FilterChip ───────────── */

function FilterChip({
  active,
  icon,
  title,
  subtitle,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  active?: boolean
  icon?: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <button
      type='button'
      data-slot='filter-chip'
      data-active={active ? 'true' : 'false'}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm transition-all',
        'border border-border bg-card/80 hover:border-primary hover:shadow-sm hover:-translate-y-px',
        'active && border-primary active:bg-primary/10',
        className
      )}
      {...props}
    >
      {icon && (
        <span className='flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white'>
          {icon}
        </span>
      )}
      <span className='flex min-w-0 flex-col leading-tight'>
        <span className='truncate font-semibold'>{title}</span>
        {subtitle && (
          <span className='truncate text-[11px] text-muted-foreground'>
            {subtitle}
          </span>
        )}
      </span>
    </button>
  )
}

/* ───────────── SuccessBars ───────────── */

function SuccessBars({
  bars,
  label,
  percentage,
  className,
}: {
  bars: boolean[]
  label?: string
  percentage: string
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-2 tabular-nums', className)}
      role='img'
      aria-label={`${label ?? '成功率'} ${percentage}`}
    >
      <span className='inline-flex h-4 items-end gap-0.5'>
        {bars.map((hit, i) => (
          <i
            key={i}
            className={cn(
              'w-0.5 rounded-[1px]',
              hit ? 'bg-success h-4' : 'bg-muted-foreground/40 h-[7px]'
            )}
          />
        ))}
      </span>
      <span className='font-bold text-success'>{percentage}</span>
    </span>
  )
}

/* ───────────── CurrencyDisplayToggle ───────────── */
/**
 * 用户级币种显示偏好切换器。
 * 只改 localStorage + 派发事件；不写回系统 config、不改变计费。
 */

const CURRENCY_KEY = 'lc-display-currency'

function getDisplayCurrency(): 'CNY' | 'USD' {
  if (typeof window === 'undefined') return 'CNY'
  const stored = localStorage.getItem(CURRENCY_KEY)
  if (stored === 'USD') return 'USD'
  // 首次访问：中文 locale 默认 CNY，其他默认 USD
  if (typeof navigator !== 'undefined') {
    const zh = navigator.language?.toLowerCase().startsWith('zh')
    return zh ? 'CNY' : 'USD'
  }
  return 'CNY'
}

function setDisplayCurrency(cur: 'CNY' | 'USD') {
  localStorage.setItem(CURRENCY_KEY, cur)
  window.dispatchEvent(
    new CustomEvent('display-currency-change', { detail: { currency: cur } })
  )
}

function CurrencyDisplayToggle({ className }: { className?: string }) {
  const [cur, setCur] = React.useState<'CNY' | 'USD'>(getDisplayCurrency)

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.currency) setCur(detail.currency)
    }
    window.addEventListener('display-currency-change', handler)
    return () => window.removeEventListener('display-currency-change', handler)
  }, [])

  return (
    <div
      role='group'
      aria-label='计费单位'
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border bg-card/85 p-0.5',
        className
      )}
    >
      {(['CNY', 'USD'] as const).map((c) => {
        const active = cur === c
        return (
          <a
            key={c}
            href={
              typeof window !== 'undefined'
                ? `${window.location.pathname}?currency=${c}`
                : undefined
            }
            aria-current={active ? 'true' : 'false'}
            onClick={(e) => {
              e.preventDefault()
              setDisplayCurrency(c)
            }}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold transition-colors',
              active
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {c === 'CNY' ? '¥ 元' : '$ USD'}
          </a>
        )
      })}
    </div>
  )
}

export {
  FilterChip,
  SuccessBars,
  CurrencyDisplayToggle,
  getDisplayCurrency,
  setDisplayCurrency,
  CURRENCY_KEY,
}
