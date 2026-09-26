/*
Copyright (C) 2026 LLM Commons contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import {
  formatDisplayAmount,
  getDisplayCurrency,
  getDisplayExchangeRate,
  getOfficialPriceCny,
} from '@/lib/display-currency'
import type { OfficialPricingEntry } from '@/features/channels/components/pricing/types'

import { DEFAULT_TOKEN_UNIT } from '../constants'
import { isTokenBasedModel } from '../lib/model-helpers'
import { formatPrice } from '../lib/price'
import type { PricingModel, TokenUnit } from '../types'

export interface TransparentPricingTableProps {
  models: PricingModel[]
  officialPricing: Record<string, OfficialPricingEntry>
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  selectedGroup?: string
  onModelClick?: (modelName: string) => void
}

function formatOfficialPrice(
  entry: OfficialPricingEntry | undefined,
  field: 'input' | 'output',
  displayCurrency: 'CNY' | 'USD',
  displayExchangeRate: number
) {
  if (!entry || !Number.isFinite(entry[field])) return '—'
  const cny = getOfficialPriceCny(
    { input: entry.input, output: entry.output, region: entry.region },
    displayExchangeRate
  )[field]
  return formatDisplayAmount(cny, displayCurrency, displayExchangeRate, 2)
}

export function TransparentPricingTable({
  models,
  officialPricing,
  priceRate = 1,
  usdExchangeRate = 1,
  tokenUnit = DEFAULT_TOKEN_UNIT,
  selectedGroup,
  onModelClick,
}: TransparentPricingTableProps) {
  const { t } = useTranslation()
  const displayCurrency = getDisplayCurrency()
  const displayExchangeRate = getDisplayExchangeRate()

  // 无官方基准价时的参照系标注：有 vendor=官方渠道待补录，无 vendor=本站自有渠道。
  const regionLabel = (
    official: OfficialPricingEntry | undefined,
    hasVendor: boolean
  ) => {
    if (official) {
      return official.region === 'domestic' ? '¥ / 1M' : '$ / 1M'
    }
    return hasVendor ? t('官网价待补录') : t('本站自有渠道')
  }

  // 无官方价时的来源列标注：有 vendor=暂无来源（待补录），无 vendor=无公开官网价。
  const sourceLabel = (
    official: OfficialPricingEntry | undefined,
    hasVendor: boolean
  ) => {
    if (official?.source_url) return null // 有来源时渲染链接，不走此分支
    return hasVendor ? t('暂无来源') : t('无公开官网价')
  }

  return (
    <div className='space-y-3'>
      <div className='border-primary/20 bg-primary/5 rounded-xl border px-4 py-3 text-sm'>
        <div className='font-semibold'>{t('定价透明')}</div>
        <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
          {t('官网基准价与本站实际售价并列展示，价格均按每 1M tokens 计算。')}
        </p>
      </div>
      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full min-w-[1080px] text-sm'>
          <thead className='bg-muted/45 text-muted-foreground text-left text-xs'>
            <tr>
              <th className='px-4 py-3 font-medium'>{t('模型 / 渠道')}</th>
              <th className='px-4 py-3 font-medium'>{t('参照系')}</th>
              <th className='px-4 py-3 text-right font-medium'>
                {t('官网输入')}
              </th>
              <th className='px-4 py-3 text-right font-medium'>
                {t('官网输出')}
              </th>
              <th className='px-4 py-3 text-right font-medium'>{t('倍率')}</th>
              <th className='px-4 py-3 text-right font-medium'>
                {t('本站输入')}
              </th>
              <th className='px-4 py-3 text-right font-medium'>
                {t('本站输出')}
              </th>
              <th className='px-4 py-3 font-medium'>{t('来源认证')}</th>
              <th className='px-4 py-3 font-medium'>{t('核验日')}</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {models.map((model) => {
              const official = officialPricing[model.model_name.toLowerCase()]
              const tokenBased = isTokenBasedModel(model)
              const siteInput = tokenBased
                ? formatPrice(
                    model,
                    'input',
                    tokenUnit,
                    false,
                    priceRate,
                    usdExchangeRate,
                    selectedGroup
                  )
                : '—'
              const siteOutput = tokenBased
                ? formatPrice(
                    model,
                    'output',
                    tokenUnit,
                    false,
                    priceRate,
                    usdExchangeRate,
                    selectedGroup
                  )
                : '—'

              return (
                <tr
                  key={model.id}
                  className='hover:bg-muted/25 cursor-pointer transition-colors'
                  onClick={() => onModelClick?.(model.model_name)}
                >
                  <td className='px-4 py-3'>
                    <div className='font-mono text-xs font-semibold'>
                      {model.model_name}
                    </div>
                    <div className='text-muted-foreground mt-1 text-xs'>
                      {model.vendor_name || t('官方渠道')}
                    </div>
                  </td>
                  <td className='px-4 py-3 whitespace-nowrap'>
                    <span
                      className={
                        official
                          ? 'text-xs font-medium'
                          : 'text-muted-foreground text-xs'
                      }
                    >
                      {regionLabel(official, Boolean(model.vendor_name))}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-right font-mono text-xs tabular-nums'>
                    {formatOfficialPrice(official, 'input', displayCurrency, displayExchangeRate)}
                  </td>
                  <td className='px-4 py-3 text-right font-mono text-xs tabular-nums'>
                    {formatOfficialPrice(official, 'output', displayCurrency, displayExchangeRate)}
                  </td>
                  <td className='px-4 py-3 text-right font-mono text-xs tabular-nums'>
                    {tokenBased ? `×${model.model_ratio.toFixed(2)}` : '—'}
                  </td>
                  <td className='px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums'>
                    {siteInput}
                  </td>
                  <td className='px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums'>
                    {siteOutput}
                  </td>
                  <td className='px-4 py-3'>
                    {official?.source_url ? (
                      <a
                        href={official.source_url}
                        target='_blank'
                        rel='noreferrer'
                        className='text-primary inline-flex items-center gap-1 text-xs hover:underline'
                        onClick={(event) => event.stopPropagation()}
                      >
                        <StatusBadge
                          label={t('官网已认证')}
                          size='sm'
                          variant='success'
                          copyable={false}
                        />
                        <ExternalLink className='size-3' />
                      </a>
                    ) : (
                      <span className='text-muted-foreground text-xs'>
                        {sourceLabel(official, Boolean(model.vendor_name))}
                      </span>
                    )}
                  </td>
                  <td className='text-muted-foreground px-4 py-3 text-xs whitespace-nowrap'>
                    {official?.verified_on || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
