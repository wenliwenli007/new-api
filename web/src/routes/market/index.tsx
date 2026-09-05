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
import { createFileRoute, redirect } from '@tanstack/react-router'

import { ModelMarket } from '@/features/market'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'

function getModulesFromCachedStatus(): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem('status')
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export const Route = createFileRoute('/market/')({
  // root 可在系统设置 → 顶部导航里关闭模型市场（modules.market=false）；
  // 关闭后直接访问本路由重定向回首页（status 快照随导航数据同源更新）。
  beforeLoad: () => {
    const modules = parseHeaderNavModulesFromStatus(getModulesFromCachedStatus())
    if (modules?.market === false) {
      throw redirect({ to: '/' })
    }
  },
  component: ModelMarket,
})
