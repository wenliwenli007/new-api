/*
Copyright (C) 2023-2026 QuantumNous

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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

/** v2 Hero：严格对齐 prototype/llmcommons-ia/index.html——
 *  居中排版：绿色同步徽章 + 大标题 + 副文案 + 深色主按钮/描边次按钮。 */
export function Hero(props: HeroProps) {
  const { t } = useTranslation()

  return (
    <section className='relative z-10 px-6 pt-14 pb-9 text-center md:pt-20'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-25 dark:opacity-[0.12]'
        style={{
          background: [
            'radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.18 250 / 80%) 0%, transparent 70%)',
            'radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.65 0.15 200 / 60%) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 35% at 40% 80%, oklch(0.70 0.12 280 / 40%) 0%, transparent 70%)',
          ].join(', '),
        }}
      />

      {/* ✓ 官网价格每日同步徽章（badge-success 对齐原型） */}
      <div className='bg-success/10 text-success mb-3.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold'>
        ✓ {t('home.hero.badge')}
      </div>

      <h1 className='text-[clamp(1.9rem,4vw,2.4rem)] leading-[1.2] font-extrabold tracking-tight'>
        {t('home.hero.title')}
      </h1>
      <p className='text-muted-foreground mx-auto mt-3 max-w-[660px] text-[15px] leading-relaxed'>
        {t('home.hero.subtitle')}
      </p>

      <div className='mt-6 flex flex-wrap items-center justify-center gap-2'>
        <Button
          className='h-10 rounded-full bg-slate-900 px-[18px] text-[13.5px] font-semibold text-white hover:bg-slate-800'
          render={<Link to='/market' />}
        >
          {t('home.hero.ctaMarket')}
        </Button>
        <Button
          variant='outline'
          className='bg-card/85 h-10 rounded-full px-[18px] text-[13.5px] font-semibold hover:border-primary hover:text-primary'
          render={
            <Link to={props.isAuthenticated ? '/dashboard' : '/sign-in'} />
          }
        >
          {t('home.hero.ctaConsole')}
        </Button>
      </div>
    </section>
  )
}
