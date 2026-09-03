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

For commercial licensing, please contact support@quantumnous.com.
*/
import { createFileRoute } from '@tanstack/react-router'

import { ChannelHealth } from '@/features/health'

// 公开服务状态页：模型健康（/api/perf-metrics/summary）与平台组件状态
// （/api/uptime/status）均为公开只读数据，无需鉴权门控。
export const Route = createFileRoute('/health/')({
  component: ChannelHealth,
})
