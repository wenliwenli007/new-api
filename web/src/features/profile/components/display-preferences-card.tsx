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
import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CurrencyDisplayToggle,
  getDisplayCurrency,
} from '@/components/ui/v2-widgets'
import { ReferenceSystemCard } from '@/components/ui/v2-reference'

/**
 * 用户级显示偏好卡：计费单位（¥/$）切换。
 * 仅改 localStorage 显示偏好并派发事件；不写回系统配置，
 * 不影响 quota、余额、充值或计费结算。
 */
export function DisplayPreferencesCard() {
  const { t } = useTranslation()
  const current = getDisplayCurrency()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.displayPrefs.title')}</CardTitle>
        <CardDescription>
          {t('profile.displayPrefs.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-3'>
        <CurrencyDisplayToggle />
        <div className='grid gap-2.5 sm:grid-cols-2'>
          <ReferenceSystemCard
            region='domestic'
            title={t('profile.displayPrefs.domestic.title')}
            description={t('profile.displayPrefs.domestic.description')}
            icon='¥'
          />
          <ReferenceSystemCard
            region='international'
            title={t('profile.displayPrefs.international.title')}
            description={t('profile.displayPrefs.international.description')}
            icon='$'
          />
        </div>
        <p className='text-muted-foreground/70 text-xs leading-relaxed'>
          {t('profile.displayPrefs.note', {
            currency: current === 'CNY' ? '¥' : '$',
          })}
        </p>
      </CardContent>
    </Card>
  )
}
