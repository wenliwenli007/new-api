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
import { useTranslation } from 'react-i18next'

import { GlassSurface, PastelBackdrop } from '@/components/ui/v2-surfaces'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
}

/** v2.5 紫主题登录布局：上下结构（对齐 prototype/llmcommons-ia/index.html 的
 *  居中式节奏）——顶部品牌条 → 渐变大标题居中 → 卖点三卡横排 → 表单卡居中。 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  const sellingPoints = [
    {
      title: t('Official channels, direct'),
      desc: t('Sources and prices are verifiable'),
      tag: t('Trusted'),
      tagClass: 'border-success/30 bg-success/10 text-success',
    },
    {
      title: t('OpenAI-compatible'),
      desc: t('base_url needs no /v1 suffix'),
      tag: t('Easy to integrate'),
      tagClass: 'border-primary/30 bg-primary/10 text-primary',
    },
    {
      title: t('Two-factor authentication'),
      desc: t('An extra layer for sensitive actions'),
      tag: '2FA',
      tagClass: 'border-primary/30 bg-primary/10 text-primary',
    },
  ]

  return (
    <div className='relative min-h-svh max-w-none'>
      <PastelBackdrop />
      {/* 顶部品牌条 */}
      <Link
        to='/'
        className='absolute top-4 left-4 z-20 flex items-center gap-2 transition-opacity hover:opacity-80 sm:top-6 sm:left-8'
      >
        <div className='relative h-8 w-8'>
          {loading ? (
            <Skeleton className='absolute inset-0 rounded-full' />
          ) : (
            <img
              src={logo}
              alt={t('Logo')}
              className='h-8 w-8 rounded-full object-cover'
            />
          )}
        </div>
        {loading ? (
          <Skeleton className='h-6 w-24' />
        ) : (
          <span className='text-base font-bold tracking-tight'>
            {systemName}
          </span>
        )}
      </Link>

      {/* 主区：上下流 */}
      <div className='relative z-10 mx-auto max-w-3xl px-4 pt-20 pb-10 text-center sm:px-6'>
        <span className='border-primary/25 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold'>
          {t('Welcome back')}
        </span>
        <h1 className='mt-4 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl'>
          {t('One token for every official model')}
        </h1>
        <p className='text-muted-foreground mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-[15px]'>
          {t(
            'Manage API keys, call logs and balance after signing in. Official channels with verifiable prices.'
          )}
        </p>
      </div>

      {/* 卖点三卡（横排，移动端纵落） */}
      <div className='relative z-10 mx-auto grid max-w-4xl gap-3 px-4 sm:grid-cols-3 sm:px-6'>
        {sellingPoints.map((p) => (
          <div
            key={p.title}
            className='bg-card/70 border-border/70 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left'
          >
            <div>
              <div className='text-sm font-semibold'>{p.title}</div>
              <div className='text-muted-foreground mt-0.5 text-xs'>
                {p.desc}
              </div>
            </div>
            <span
              className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${p.tagClass}`}
            >
              {p.tag}
            </span>
          </div>
        ))}
      </div>

      {/* 表单卡（居中 460px） */}
      <div className='relative z-10 flex items-start justify-center px-4 py-8 sm:px-8'>
        <GlassSurface
          variant='shell'
          className='w-full max-w-[460px] space-y-6 p-6 sm:p-8'
        >
          {children}
        </GlassSurface>
      </div>
    </div>
  )
}
