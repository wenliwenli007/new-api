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

/**
 * v2 视觉原语：粉彩渐变页面底幕。
 * 仅作为公开层页面的装饰背景层，不污染认证后台。
 * 颜色全部走语义 token 的透明度变体，light/dark 自动适配。
 */
function PastelBackdrop({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden='true'
      data-slot='pastel-backdrop'
      className={cn(
        'pointer-events-none fixed inset-0 -z-10',
        'bg-radial-[at_8%_-6%] from-primary/8 via-transparent to-transparent',
        'bg-radial-[at_96%_4%] from-chart-3/8 via-transparent to-transparent',
        'bg-radial-[at_50%_108%] from-chart-4/6 via-transparent to-transparent',
        'bg-linear-165 from-background via-background to-background',
        className
      )}
      {...props}
    />
  )
}

/**
 * v2 玻璃拟态表面：半透明卡片 + 背景模糊。
 * 复用 Card 语义 token；dark 模式下降低透明度保证可读性。
 */
function GlassSurface({
  className,
  variant = 'card',
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'card' | 'shell' | 'inset'
}) {
  return (
    <div
      data-slot='glass-surface'
      data-variant={variant}
      className={cn(
        'rounded-2xl text-foreground',
        'border border-border/60 dark:border-border/50',
        'bg-card/70 backdrop-blur-md dark:bg-card/60 dark:backdrop-blur-lg',
        'shadow-xs ring-0',
        'transition-[box-shadow,transform] duration-150',
        variant === 'card' && 'p-5',
        variant === 'shell' && 'p-6 sm:p-6',
        variant === 'inset' && 'bg-muted/30 dark:bg-muted/20 backdrop-blur-sm p-4',
        className
      )}
      {...props}
    />
  )
}

export { PastelBackdrop, GlassSurface }
