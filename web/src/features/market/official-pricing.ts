export type OfficialTokenPrice = {
  version: string
  model: string
  inputUsdPerMillion: number
  outputUsdPerMillion: number
  sourceUrl: string
  verifiedOn: string
}

export type DisplayedPrice = {
  systemInputUsd: number
  systemOutputUsd: number
  systemInputCny: number
  systemOutputCny: number
  effectiveOfficialMultiplier: number
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

  const effectiveOfficialMultiplier =
    systemInputUsd / officialPrice.inputUsdPerMillion
  if (!Number.isFinite(effectiveOfficialMultiplier)) return null

  return {
    systemInputUsd,
    systemOutputUsd,
    systemInputCny,
    systemOutputCny,
    effectiveOfficialMultiplier,
  }
}
