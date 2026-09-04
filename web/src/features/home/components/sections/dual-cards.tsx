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
import { useTranslation } from 'react-i18next'

import { GlassSurface } from '@/components/ui/v2-surfaces'

function Chip({ label }: { label: string }) {
  return (
    <span className='bg-card/85 border-border rounded-full border px-3.5 py-2 text-xs font-medium'>
      {label}
    </span>
  )
}

/** v2 双卡：给开发者 / 给采购者（严格对齐原型 index.html 的 .dual .explain 卡片） */
export function DualCards() {
  const { t } = useTranslation()
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://llmcommons.com'

  return (
    <GlassShell>
      <div className='grid gap-4 sm:grid-cols-2'>
        {/* 给开发者 */}
        <article className='bg-card/60 border-border/60 rounded-2xl border p-6'>
          <div className='mb-1.5 flex items-center gap-2 text-[13.5px] font-bold'>
            <span className='bg-foreground flex size-[22px] items-center justify-center rounded-md text-xs text-white'>
              ⌘
            </span>
            {t('home.dev.title')}
          </div>
          <p className='text-muted-foreground text-xs leading-[1.7]'>
            {t('home.dev.textBefore')}
            <span className='text-primary font-mono text-xs'>{origin}</span>
            {t('home.dev.textMid')}
            <span className='font-mono text-xs'>/v1</span>
            {t('home.dev.textAfter')}
          </p>
          <div className='mt-4 flex flex-wrap gap-2'>
            {(t('home.dev.chips', { returnObjects: true }) as string[]).map(
              (c) => (
                <Chip key={c} label={c} />
              )
            )}
          </div>
        </article>

        {/* 给采购者 */}
        <article className='bg-card/60 border-border/60 rounded-2xl border p-6'>
          <div className='mb-1.5 flex items-center gap-2 text-[13.5px] font-bold'>
            <span className='bg-success flex size-[22px] items-center justify-center rounded-md text-xs text-white'>
              ¥
            </span>
            {t('home.buyer.title')}
          </div>
          <p className='text-muted-foreground text-xs leading-[1.7]'>
            {t('home.buyer.text')}
          </p>
          <div className='mt-4 flex flex-wrap gap-2'>
            {(
              t('home.buyer.chips', { returnObjects: true }) as string[]
            ).map((c) => (
              <Chip key={c} label={c} />
            ))}
          </div>
        </article>
      </div>
    </GlassShell>
  )
}

/** 原型 .page-shell：白色玻璃壳 + 右上绿色模糊光斑（首页第二/三区段共用外框） */
function GlassShell({ children }: { children: React.ReactNode }) {
  return (
    <GlassSurface
      variant='shell'
      className='relative mt-4 overflow-hidden p-6 sm:p-7'
    >
      <div
        aria-hidden
        className='bg-success/10 pointer-events-none absolute -top-36 -right-24 size-[280px] rounded-full blur-xl'
      />
      <div className='relative'>{children}</div>
    </GlassSurface>
  )
}

export { GlassShell }
