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
import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  CACHE_MODE_GENERIC,
  evalExprLocally,
  generateExprFromVisualConfig,
  tryParseVisualConfig,
  type ExtraTokenValues,
  type VisualConfig,
  type VisualTier,
} from '../tier-expr'

const extras: ExtraTokenValues = {
  cacheReadTokens: 10,
  cacheCreateTokens: 20,
  cacheCreate1hTokens: 30,
  imageTokens: 40,
  imageOutputTokens: 50,
  audioInputTokens: 60,
  audioOutputTokens: 70,
}

function tier(label: string, input = 2, output = 4): VisualTier {
  return {
    label,
    conditions: [],
    input_unit_cost: input,
    output_unit_cost: output,
    cache_mode: CACHE_MODE_GENERIC,
  }
}

describe('safe tier expression preview', () => {
  test('evaluates a single tier', () => {
    const result = evalExprLocally(
      'tier("base", p * 2 + c * 4)',
      10,
      5,
      extras
    )
    assert.deepEqual(result, { cost: 40, matchedTier: 'base', error: null })
  })

  test('selects multiple tiers in order and honors condition boundaries', () => {
    const expression =
      'len <= 100 ? tier("short", p * 1 + c * 2) : len > 100 ? tier("long", p * 3 + c * 4) : tier("fallback", p * 9 + c * 9)'
    const noExtras = {
      ...extras,
      cacheReadTokens: 0,
      cacheCreateTokens: 0,
      cacheCreate1hTokens: 0,
    }
    assert.equal(
      evalExprLocally(expression, 100, 2, noExtras).matchedTier,
      'short'
    )
    assert.equal(
      evalExprLocally(expression, 101, 2, noExtras).matchedTier,
      'long'
    )
    assert.equal(tryParseVisualConfig(expression)?.tiers.length, 3)
  })

  test('supports two comparison conditions in a tier', () => {
    const expression =
      'p > 10 && c <= 20 ? tier("bounded", p * 2 + c * 3) : tier("base", p * 1 + c * 1)'
    const parsed = tryParseVisualConfig(expression)
    assert.equal(parsed?.tiers[0].conditions.length, 2)
    assert.equal(evalExprLocally(expression, 11, 20, extras).matchedTier, 'bounded')
    assert.equal(evalExprLocally(expression, 10, 20, extras).matchedTier, 'base')
  })

  test('evaluates cache and media variables', () => {
    const result = evalExprLocally(
      'tier("media", p * 1 + c * 2 + cr * 3 + cc * 4 + cc1h * 5 + img * 6 + img_o * 7 + ai * 8 + ao * 9)',
      10,
      2,
      extras
    )
    assert.equal(result.error, null)
    assert.equal(result.cost, 10 + 4 + 30 + 80 + 150 + 240 + 350 + 480 + 630)
  })

  test('round-trips labels containing quotes, slashes, and newlines', () => {
    const config: VisualConfig = { tiers: [tier('a"b\\c\nd')] }
    const expression = generateExprFromVisualConfig(config)
    assert.match(expression, /a\\"b\\\\c\\nd/)
    assert.deepEqual(tryParseVisualConfig(expression)?.tiers[0].label, config.tiers[0].label)
    assert.equal(generateExprFromVisualConfig(tryParseVisualConfig(expression)), expression)
  })

  test('rejects empty, request-rule, unknown, and malformed expressions', () => {
    for (const expression of [
      '',
      'header("x") == "y" ? 2 : 1',
      'request_rule("x")',
      'unknown(1)',
      'p * 2',
    ]) {
      const result = evalExprLocally(expression, 1, 1, extras)
      assert.equal(result.unavailable, true)
      assert.ok(result.error)
    }
  })

  test('never executes JavaScript or unsafe member/assignment syntax', () => {
    const globalObject = globalThis as typeof globalThis & { __tierPwned?: boolean }
    delete globalObject.__tierPwned
    const expressions = [
      'globalThis.fetch("https://evil.invalid")',
      'window.fetch("https://evil.invalid")',
      'document.cookie',
      'constructor.constructor("globalThis.__tierPwned = true")()',
      'tier("x", p * 1).constructor',
      'p = 1',
      'fetch("https://evil.invalid")',
    ]
    for (const expression of expressions) {
      const result = evalExprLocally(expression, 1, 1, extras)
      assert.equal(result.unavailable, true)
      assert.ok(result.error)
    }
    assert.equal(globalObject.__tierPwned, undefined)
  })

  test('rejects oversized and deeply nested input without evaluating it', () => {
    const oversized = `tier("x", p * 1 + c * 1)${' '.repeat(16_384)}`
    assert.equal(evalExprLocally(oversized, 1, 1, extras).unavailable, true)
    const deep = `${'p < 1 ? '.repeat(40)}tier("x", p * 1 + c * 1)${' : tier("x", p * 1 + c * 1)'.repeat(40)}`
    assert.equal(evalExprLocally(deep, 1, 1, extras).unavailable, true)
  })
})
