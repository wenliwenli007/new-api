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
import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Placeholder console for ShareLLM-specific admin domains. Routes and layout
// are frozen per 03-详细设计; internal structures require authenticated
// inspection on the reference site (see 01-SRS §11 credibility levels).
export function AdminPlaceholder({ domain }: { domain: string }) {
  const { t } = useTranslation()
  const rows: Record<string, string> = {
    'cert-pools': t('sharellm.admin.certPools', '认证池成员管理（Base-URL 认证池）'),
    orders: t('sharellm.admin.orders', '充值/订阅/提现订单'),
    'tier-config': t('sharellm.admin.tierConfig', '贡献者层级与佣金率配置'),
    contributors: t('sharellm.admin.contributors', '贡献者审核/冻结/认证'),
    proxies: t('sharellm.admin.proxies', '出口代理管理'),
    applications: t('sharellm.admin.applications', '第三方应用 Key'),
    withdrawals: t('sharellm.admin.withdrawals', '提现审核与打款'),
    'auto-router': t('sharellm.admin.autoRouter', '自动选路规则'),
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>
          {t('sharellm.admin.title', 'ShareLLM 管理')} — {domain}
        </h1>
        <CardDescription className='mt-1'>
          {t(
            'sharellm.admin.subtitle',
            '原型预留页面：路由与布局已冻结，内部字段待登录态核对后填充。'
          )}
        </CardDescription>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Construction className='size-4' />
            {rows[domain] ?? domain}
          </CardTitle>
        </CardHeader>
        <CardContent className='px-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t('sharellm.admin.col.status', '状态')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className='text-muted-foreground'>—</TableCell>
                <TableCell>
                  {t('sharellm.admin.mockNote', 'mock 空表格（原型阶段无数据）')}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
