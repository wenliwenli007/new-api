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

/**
 * official_pricing 后端快照的单条记录。
 * 金额口径由 region 决定（方案 B）：
 *  - domestic：¥/1M（各厂国内官网价），展示时不乘汇率
 *  - international（含空值）：$/M（国际版官网价），展示时乘 usd_exchange_rate
 */
export type OfficialPricingEntry = {
  input: number
  output: number
  cached_input?: number
  cache_write?: number
  source_url?: string
  source_preset?: string
  verified_on?: string
  region?: 'domestic' | 'international' | string
}

export type OfficialPricingSnapshotItem = {
  model: string
  price: OfficialPricingEntry
}

/** 该记录是否国内人民币口径。 */
export function isDomesticPrice(entry: OfficialPricingEntry): boolean {
  return (entry.region ?? '').trim().toLowerCase() === 'domestic'
}
