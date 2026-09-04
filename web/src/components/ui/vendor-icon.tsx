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
import { cn } from '@/lib/utils'

/** v2：供应商品牌色（严格对齐设计稿色块图标；知名厂商固定色，其余哈希派生） */
const VENDOR_COLORS: Record<string, string> = {
  deepseek: '#4F46E5',
  智谱: '#22C55E',
  zhipu: '#22C55E',
  glm: '#22C55E',
  kimi: '#0EA5E9',
  moonshot: '#0EA5E9',
  qwen: '#7C3AED',
  阿里: '#7C3AED',
  minimax: '#18181B',
  sensenova: '#F59E0B',
  openai: '#18181B',
  gpt: '#18181B',
  claude: '#D97706',
  anthropic: '#D97706',
  gemini: '#3B82F6',
  google: '#3B82F6',
}

function vendorColor(name?: string): string {
  const n = (name || '').toLowerCase()
  for (const key of Object.keys(VENDOR_COLORS)) {
    if (n.includes(key)) return VENDOR_COLORS[key]
  }
  let hash = 0
  for (const ch of n) hash = (hash * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${hash} 65% 50%)`
}

/** 品牌色块图标：首字母 + 品牌色圆角块（市场页/首页热门模型共用） */
function VendorIcon({
  name,
  size = 'size-7',
}: {
  name?: string
  size?: string
}) {
  const letter = (name || '?').trim()[0]?.toUpperCase() ?? '?'
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white',
        size
      )}
      style={{ background: vendorColor(name) }}
    >
      {letter}
    </span>
  )
}

export { VendorIcon, vendorColor, VENDOR_COLORS }
