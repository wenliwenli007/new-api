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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { VendorIcon } from '@/components/ui/vendor-icon'
import { usePricingData } from '@/features/pricing/hooks'
import { useOfficialPricing } from '@/features/channels/hooks/use-official-pricing'
import { isDomesticPrice } from '@/features/channels/components/pricing/types'

import { GlassShell } from './dual-cards'

const HOT_MODEL_COUNT = 6

/** v2 热门官方模型：原型 index.html 的 hotmodels chips——
 *  品牌色块图标 + 模型名 + 官网输入价（¥/1M 国内口径）。 */
export function HotModels() {
  const { t } = useTranslation()
  const { models, usdExchangeRate } = usePricingData()
  const { officialPricing } = useOfficialPricing()

  const hot = models.slice(0, HOT_MODEL_COUNT)

  const officialInputCny = (modelName: string, modelRatio: number): number | null => {
    const entry = officialPricing?.[modelName.toLowerCase()]
    const rate =
      typeof usdExchangeRate === 'number' && usdExchangeRate > 0
        ? usdExchangeRate
        : null
    if (entry && entry.input > 0) {
      // 方案 B：domestic 记录已是 ¥/1M；国际记录为 $/M 需乘实时汇率
      if (isDomesticPrice(entry)) return entry.input
      return rate ? entry.input * rate : null
    }
    // 无官网基准时回落本站售价（¥/1M）
    return rate ? modelRatio * 2 * rate : null
  }

  return (
    <GlassShell>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-lg font-extrabold'>{t('home.hot.title')}</h2>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            {t('home.hot.subtitle')}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='bg-card/85 hover:border-primary hover:text-primary rounded-full text-xs font-semibold'
          render={<Link to='/market' />}
        >
          {t('home.hot.browse')}
        </Button>
      </div>
      <div className='mt-4 flex gap-2.5 overflow-x-auto pb-1'>
        {hot.map((model) => {
          const price = officialInputCny(
            model.model_name,
            model.model_ratio || 0
          )
          return (
            <Link
              key={model.model_name}
              to='/pricing/$modelId'
              params={{ modelId: model.model_name }}
              className='bg-card/85 border-border hover:border-primary hover:shadow-primary/10 flex shrink-0 items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-all hover:-translate-y-px hover:shadow-md'
            >
              <VendorIcon name={model.vendor_name} size='size-[26px]' />
              <span className='flex min-w-0 flex-col leading-tight'>
                <span className='max-w-[180px] truncate font-mono text-[13px] font-bold'>
                  {model.model_name}
                </span>
                <span className='text-muted-foreground/70 text-[11px]'>
                  {price == null
                    ? '—'
                    : t('home.hot.officialInput', {
                        price: `¥${price.toFixed(price > 0 && price < 0.01 ? 4 : 2)}`,
                      })}
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </GlassShell>
  )
}
