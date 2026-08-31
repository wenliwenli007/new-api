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
import { BILLING_CACHE_VAR_MAP } from './billing-expr'

export const CACHE_MODE_TIMED = 'timed'
export const CACHE_MODE_GENERIC = 'generic'
export type CacheMode = typeof CACHE_MODE_TIMED | typeof CACHE_MODE_GENERIC

export type TierConditionInput = {
  var: 'p' | 'c' | 'len'
  op: '<' | '<=' | '>' | '>='
  value: number | string
}

export type VisualTier = {
  label: string
  conditions: TierConditionInput[]
  input_unit_cost: number
  output_unit_cost: number
  cache_mode: CacheMode
  cache_read_unit_cost?: number
  cache_create_unit_cost?: number
  cache_create_1h_unit_cost?: number
  image_unit_cost?: number
  image_output_unit_cost?: number
  audio_input_unit_cost?: number
  audio_output_unit_cost?: number
  [field: string]: unknown
}

export type VisualConfig = {
  tiers: VisualTier[]
}

export function getTierCacheMode(
  tier: Partial<VisualTier> | null | undefined
): CacheMode {
  if (tier?.cache_mode === CACHE_MODE_TIMED) return CACHE_MODE_TIMED
  if (tier?.cache_mode === CACHE_MODE_GENERIC) return CACHE_MODE_GENERIC
  return Number(tier?.cache_create_1h_unit_cost) > 0
    ? CACHE_MODE_TIMED
    : CACHE_MODE_GENERIC
}

export function normalizeVisualTier(
  tier: Partial<VisualTier> = {}
): VisualTier {
  return {
    label: tier.label ?? '',
    input_unit_cost: Number(tier.input_unit_cost) || 0,
    output_unit_cost: Number(tier.output_unit_cost) || 0,
    cache_mode: getTierCacheMode(tier),
    conditions: Array.isArray(tier.conditions) ? tier.conditions : [],
    ...tier,
    cache_read_unit_cost: Number(tier.cache_read_unit_cost) || 0,
    cache_create_unit_cost: Number(tier.cache_create_unit_cost) || 0,
    cache_create_1h_unit_cost: Number(tier.cache_create_1h_unit_cost) || 0,
    image_unit_cost: Number(tier.image_unit_cost) || 0,
    image_output_unit_cost: Number(tier.image_output_unit_cost) || 0,
    audio_input_unit_cost: Number(tier.audio_input_unit_cost) || 0,
    audio_output_unit_cost: Number(tier.audio_output_unit_cost) || 0,
  }
}

export function createDefaultVisualConfig(): VisualConfig {
  return {
    tiers: [
      normalizeVisualTier({
        conditions: [],
        input_unit_cost: 0,
        output_unit_cost: 0,
        label: 'base',
        cache_mode: CACHE_MODE_GENERIC,
      }),
    ],
  }
}

export function normalizeVisualConfig(
  config: VisualConfig | null | undefined
): VisualConfig {
  if (!config || !Array.isArray(config.tiers) || config.tiers.length === 0) {
    return createDefaultVisualConfig()
  }
  return {
    ...config,
    tiers: config.tiers.map((tier) => normalizeVisualTier(tier)),
  }
}

function finiteNumber(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function buildConditionStr(conditions: TierConditionInput[]): string {
  if (!conditions || conditions.length === 0) return ''
  return conditions
    .filter(
      (condition) =>
        (condition.var === 'p' ||
          condition.var === 'c' ||
          condition.var === 'len') &&
        (condition.op === '<' ||
          condition.op === '<=' ||
          condition.op === '>' ||
          condition.op === '>=') &&
        condition.value != null &&
        condition.value !== '' &&
        Number.isFinite(Number(condition.value))
    )
    .map((condition) => `${condition.var} ${condition.op} ${finiteNumber(condition.value)}`)
    .join(' && ')
}

function buildTierBodyExpr(tier: VisualTier): string {
  const parts: string[] = []
  const ic = finiteNumber(tier.input_unit_cost)
  const oc = finiteNumber(tier.output_unit_cost)
  parts.push(`p * ${ic}`)
  parts.push(`c * ${oc}`)
  for (const cv of BILLING_CACHE_VAR_MAP) {
    const v = finiteNumber((tier as Record<string, unknown>)[cv.field])
    if (v !== 0) parts.push(`${cv.exprVar} * ${v}`)
  }
  return parts.join(' + ')
}

export function generateExprFromVisualConfig(
  config: VisualConfig | null | undefined
): string {
  if (!config || !config.tiers || config.tiers.length === 0) {
    return 'p * 0 + c * 0'
  }
  const tiers = config.tiers

  if (tiers.length === 1) {
    const tier = tiers[0]
    const label = tier.label || 'default'
    const body = `tier(${JSON.stringify(label)}, ${buildTierBodyExpr(tier)})`
    const cond = buildConditionStr(tier.conditions)
    if (cond) {
      return `${cond} ? ${body} : p * 0 + c * 0`
    }
    return body
  }

  const parts: string[] = []
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]
    const label = tier.label || `tier_${i + 1}`
    const body = `tier(${JSON.stringify(label)}, ${buildTierBodyExpr(tier)})`
    const cond = buildConditionStr(tier.conditions)

    if (i < tiers.length - 1 && cond) {
      parts.push(`${cond} ? ${body}`)
    } else {
      parts.push(body)
    }
  }
  return parts.join(' : ')
}

const MAX_EXPR_LENGTH = 16_384
const MAX_VISUAL_TIERS = 32
const MAX_TIER_CONDITIONS = 2

function canonicalExprForm(value: string): string {
  let result = ''
  let inString = false
  let escaped = false
  for (const char of value) {
    if (inString) {
      result += char
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
    } else if (char === '"') {
      inString = true
      result += char
    } else if (!/\s/.test(char)) {
      result += char
    }
  }
  return result
}

type ParsedBranch = { tier: VisualTier; condition: TierConditionInput[] }

class CanonicalTierParser {
  private offset = 0
  private readonly source: string

  constructor(source: string) {
    this.source = source
  }

  private whitespace() {
    while (/\s/.test(this.source[this.offset] ?? '')) this.offset++
  }

  private token(value: string): boolean {
    this.whitespace()
    if (!this.source.startsWith(value, this.offset)) return false
    this.offset += value.length
    return true
  }

  private number(): number | null {
    this.whitespace()
    const match = this.source
      .slice(this.offset)
      .match(/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/)
    if (!match) return null
    const value = Number(match[0])
    if (!Number.isFinite(value)) return null
    this.offset += match[0].length
    return value
  }

  private jsonString(): string | null {
    this.whitespace()
    if (this.source[this.offset] !== '"') return null
    const start = this.offset
    this.offset++
    let escaped = false
    while (this.offset < this.source.length) {
      const char = this.source[this.offset++]
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') {
        try {
          const value = JSON.parse(this.source.slice(start, this.offset))
          return typeof value === 'string' && value.length <= 256 ? value : null
        } catch {
          return null
        }
      } else if (char === '\n' || char === '\r') {
        return null
      }
    }
    return null
  }

  private conditionAtom(): TierConditionInput | null {
    this.whitespace()
    const variable = this.source.slice(this.offset).match(/^(p|c|len)\b/)
    if (!variable) return null
    this.offset += variable[0].length
    this.whitespace()
    const operator = this.source.slice(this.offset).match(/^(<=|>=|<|>)/)
    if (!operator) return null
    this.offset += operator[0].length
    const value = this.number()
    if (value == null) return null
    return {
      var: variable[1] as TierConditionInput['var'],
      op: operator[1] as TierConditionInput['op'],
      value,
    }
  }

  private condition(): TierConditionInput[] | null {
    const first = this.conditionAtom()
    if (!first) return null
    const conditions = [first]
    while (this.token('&&')) {
      if (conditions.length >= MAX_TIER_CONDITIONS) return null
      const next = this.conditionAtom()
      if (!next) return null
      conditions.push(next)
    }
    return conditions
  }

  private tier(): VisualTier | null {
    if (!this.token('tier(')) return null
    const label = this.jsonString()
    if (label == null || !this.token(',')) return null
    if (!this.token('p') || !this.token('*')) return null
    const inputCost = this.number()
    if (inputCost == null || !this.token('+') || !this.token('c') || !this.token('*')) return null
    const outputCost = this.number()
    if (outputCost == null) return null
    const tier: Partial<VisualTier> = {
      label,
      input_unit_cost: inputCost,
      output_unit_cost: outputCost,
      conditions: [],
    }
    for (const cacheVar of BILLING_CACHE_VAR_MAP) {
      const save = this.offset
      if (!this.token('+') || !this.token(cacheVar.exprVar) || !this.token('*')) {
        this.offset = save
        break
      }
      const cost = this.number()
      if (cost == null) return null
      tier[cacheVar.field as keyof VisualTier] = cost
    }
    if (!this.token(')')) return null
    return normalizeVisualTier(tier)
  }

  private zeroCost(): boolean {
    const save = this.offset
    if (!this.token('p') || !this.token('*')) return false
    const input = this.number()
    if (input !== 0 || !this.token('+') || !this.token('c') || !this.token('*')) {
      this.offset = save
      return false
    }
    const output = this.number()
    if (output !== 0) {
      this.offset = save
      return false
    }
    return true
  }

  private branch(): { branches: ParsedBranch[]; zeroFallback: boolean } | null {
    const condition = this.condition()
    if (!condition || !this.token('?')) return null
    const tier = this.tier()
    if (!tier) return null
    const branches: ParsedBranch[] = [{ tier, condition }]
    if (!this.token(':')) return null
    if (this.zeroCost()) return { branches, zeroFallback: true }
    const next = this.condition()
    if (next) {
      if (!this.token('?')) return null
      const nextTier = this.tier()
      if (!nextTier) return null
      branches.push({ tier: nextTier, condition: next })
      while (this.token(':')) {
        if (this.zeroCost()) return { branches, zeroFallback: true }
        const conditionForTier = this.condition()
        if (conditionForTier) {
          if (!this.token('?')) return null
          const followingTier = this.tier()
          if (!followingTier) return null
          branches.push({ tier: followingTier, condition: conditionForTier })
        } else {
          const fallback = this.tier()
          if (!fallback) return null
          branches.push({ tier: fallback, condition: [] })
          return { branches, zeroFallback: false }
        }
      }
      return null
    }
    const fallback = this.tier()
    if (!fallback) return null
    branches.push({ tier: fallback, condition: [] })
    return { branches, zeroFallback: false }
  }

  parse(): VisualConfig | null {
    const firstTier = this.tier()
    let result: { branches: ParsedBranch[]; zeroFallback: boolean }
    if (firstTier) {
      result = { branches: [{ tier: firstTier, condition: [] }], zeroFallback: false }
    } else {
      result = this.branch() ?? { branches: [], zeroFallback: false }
    }
    this.whitespace()
    if (this.offset !== this.source.length || result.branches.length === 0) return null
    if (result.zeroFallback && result.branches.length !== 1) return null
    const tiers = result.branches.map(({ tier, condition }) => ({ ...tier, conditions: condition }))
    if (tiers.length > MAX_VISUAL_TIERS) return null
    const config = normalizeVisualConfig({ tiers })
    return canonicalExprForm(generateExprFromVisualConfig(config)) === canonicalExprForm(this.source)
      ? config
      : null
  }
}

export function tryParseVisualConfig(
  exprStr: string | null | undefined
): VisualConfig | null {
  if (!exprStr || exprStr.length > MAX_EXPR_LENGTH) return null
  try {
    const versionMatch = exprStr.match(/^v\\d+:([\\s\\S]*)$/)
    return new CanonicalTierParser(versionMatch ? versionMatch[1] : exprStr).parse()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Local cost evaluator (for the estimator preview)
// ---------------------------------------------------------------------------

const ESTIMATOR_VARS = [
  { var: 'cr', stateKey: 'cacheReadTokens' },
  { var: 'cc', stateKey: 'cacheCreateTokens' },
  { var: 'cc1h', stateKey: 'cacheCreate1hTokens' },
  { var: 'img', stateKey: 'imageTokens' },
  { var: 'img_o', stateKey: 'imageOutputTokens' },
  { var: 'ai', stateKey: 'audioInputTokens' },
  { var: 'ao', stateKey: 'audioOutputTokens' },
] as const

export type ExtraTokenValues = Record<
  (typeof ESTIMATOR_VARS)[number]['stateKey'],
  number
>

export type EvalResult = {
  cost: number
  matchedTier: string
  error: string | null
  unavailable?: boolean
}

export function evalExprLocally(
  exprStr: string,
  promptTokens: number,
  completionTokens: number,
  extraTokenValues: ExtraTokenValues
): EvalResult {
  if (!exprStr || !exprStr.trim()) {
    return {
      cost: 0,
      matchedTier: '',
      error: 'Expression is empty; preview is unavailable.',
      unavailable: true,
    }
  }
  if (exprStr.length > MAX_EXPR_LENGTH) {
    return {
      cost: 0,
      matchedTier: '',
      error: 'Expression is too long for safe preview.',
      unavailable: true,
    }
  }

  const config = tryParseVisualConfig(exprStr)
  if (!config || config.tiers.length > MAX_VISUAL_TIERS) {
    return {
      cost: 0,
      matchedTier: '',
      error: 'Preview is unavailable for custom expressions.',
      unavailable: true,
    }
  }

  const values: Record<string, number> = {
    p: finiteNumber(promptTokens),
    c: finiteNumber(completionTokens),
    cr: finiteNumber(extraTokenValues.cacheReadTokens),
    cc: finiteNumber(extraTokenValues.cacheCreateTokens),
    cc1h: finiteNumber(extraTokenValues.cacheCreate1hTokens),
    img: finiteNumber(extraTokenValues.imageTokens),
    img_o: finiteNumber(extraTokenValues.imageOutputTokens),
    ai: finiteNumber(extraTokenValues.audioInputTokens),
    ao: finiteNumber(extraTokenValues.audioOutputTokens),
  }
  values.len = values.p + values.cr + values.cc + values.cc1h

  const tier = config.tiers.find((candidate) =>
    candidate.conditions.every((condition) => {
      const left = values[condition.var]
      const right = finiteNumber(condition.value)
      switch (condition.op) {
        case '<':
          return left < right
        case '<=':
          return left <= right
        case '>':
          return left > right
        case '>=':
          return left >= right
        default:
          return false
      }
    })
  )
  if (!tier) {
    return {
      cost: 0,
      matchedTier: '',
      error: 'No tier matched this input; preview is unavailable.',
      unavailable: true,
    }
  }

  const cost = values.p * finiteNumber(tier.input_unit_cost) +
    values.c * finiteNumber(tier.output_unit_cost) +
    BILLING_CACHE_VAR_MAP.reduce(
      (sum, variable) =>
        sum + values[variable.exprVar] * finiteNumber(tier[variable.field]),
      0
    )
  if (!Number.isFinite(cost)) {
    return {
      cost: 0,
      matchedTier: '',
      error: 'The estimated cost is not finite; preview is unavailable.',
      unavailable: true,
    }
  }
  return { cost, matchedTier: tier.label, error: null }
}

export function exprUsesExtraVars(exprStr: string): boolean {
  if (!exprStr) return false
  const varNames = ESTIMATOR_VARS.map((f) => f.var).join('|')
  return new RegExp(`\\b(${varNames})\\b`).test(exprStr)
}

export const ESTIMATOR_EXTRA_FIELDS = ESTIMATOR_VARS
