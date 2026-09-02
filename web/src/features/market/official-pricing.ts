export type OfficialTokenPrice = {
  version: string
  model: string
  inputUsdPerMillion: number
  outputUsdPerMillion: number
  sourceUrl: string
  verifiedOn: string
  /**
   * 方案 B 参照系：true = 该官方价已是国内官网人民币口径（¥/1M），
   * 展示时不乘汇率、相对倍率直接按人民币口径计算。
   * 缺省 false = 美元口径（国际官网），乘 usd_exchange_rate 展示。
   */
  domesticRegion?: boolean
}

export type DisplayedPrice = {
  systemInputUsd: number
  systemOutputUsd: number
  systemInputCny: number
  systemOutputCny: number
  effectiveOfficialMultiplier: number
  /** 官方基准价的展示口径（¥/1M）：domestic 记录原值，international 乘汇率。 */
  officialInputCny: number
  officialOutputCny: number
  /** 官方价参照系标签（用于 UI 展示"国内官网/国际官网"）。 */
  officialRegion: 'domestic' | 'international'
}

/** Official peak token prices, in USD per million tokens. */
export const OFFICIAL_PRICING: Record<string, OfficialTokenPrice> = {
  'deepseek-v4-flash': {
    version: '2026-08-31',
    model: 'deepseek-v4-flash',
    inputUsdPerMillion: 0.44,
    outputUsdPerMillion: 1.32,
    sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing/',
    verifiedOn: '2026-08-31',
  },
  'deepseek-v4-pro': {
    version: '2026-08-31',
    model: 'deepseek-v4-pro',
    inputUsdPerMillion: 1.32,
    outputUsdPerMillion: 3.96,
    sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing/',
    verifiedOn: '2026-08-31',
  },
}

/** Resolve only explicitly configured official prices. */
export function getOfficialPrice(modelName: string): OfficialTokenPrice | undefined {
  const normalizedKey = modelName.trim().toLowerCase()
  return Object.hasOwn(OFFICIAL_PRICING, normalizedKey)
    ? OFFICIAL_PRICING[normalizedKey]
    : undefined
}

/** @deprecated Use OFFICIAL_PRICING. */

/**
 * Converts configured ratios into system and official-equivalent prices.
 * Invalid inputs return null so callers cannot render misleading prices.
 */
export function computeDisplayedPrice(
  modelRatio: number,
  completionRatio: number,
  usdExchangeRate: number,
  officialPrice: OfficialTokenPrice
): DisplayedPrice | null {
  const values = [
    modelRatio,
    completionRatio,
    usdExchangeRate,
    officialPrice?.inputUsdPerMillion,
    officialPrice?.outputUsdPerMillion,
  ]
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    return null
  }

  const systemInputUsd = modelRatio * 2
  if (!Number.isFinite(systemInputUsd)) return null

  const systemOutputUsd = systemInputUsd * completionRatio
  if (!Number.isFinite(systemOutputUsd)) return null

  const systemInputCny = systemInputUsd * usdExchangeRate
  if (!Number.isFinite(systemInputCny)) return null

  const systemOutputCny = systemOutputUsd * usdExchangeRate
  if (!Number.isFinite(systemOutputCny)) return null

  // 方案 B：官方价展示口径按参照系分支。
  // domestic：官方价已是 ¥/1M，原值展示；
  // international：官方价 $/M × 汇率。
  // 相对倍率两种口径下均按"系统卖价 ÷ 官方基准价"的人民币口径计算。
  const domestic = officialPrice.domesticRegion === true
  const officialInputCny = domestic
    ? officialPrice.inputUsdPerMillion
    : officialPrice.inputUsdPerMillion * usdExchangeRate
  const officialOutputCny = domestic
    ? officialPrice.outputUsdPerMillion
    : officialPrice.outputUsdPerMillion * usdExchangeRate
  if (!Number.isFinite(officialInputCny) || officialInputCny <= 0) return null
  if (!Number.isFinite(officialOutputCny) || officialOutputCny <= 0) return null

  const effectiveOfficialMultiplier = systemInputCny / officialInputCny
  if (!Number.isFinite(effectiveOfficialMultiplier)) return null

  return {
    systemInputUsd,
    systemOutputUsd,
    systemInputCny,
    systemOutputCny,
    effectiveOfficialMultiplier,
    officialInputCny,
    officialOutputCny,
    officialRegion: domestic ? 'domestic' : 'international',
  }
}
