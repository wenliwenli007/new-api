import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  computeDisplayedPrice,
  getOfficialPrice,
  OFFICIAL_PRICING,
} from '../official-pricing'

const flash = OFFICIAL_PRICING['deepseek-v4-flash']
const pro = OFFICIAL_PRICING['deepseek-v4-pro']

function assertClose(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-12)
}

describe('official market price display', () => {
  test('exposes the versioned Flash and Pro official pricing record', () => {
    assert.deepEqual(OFFICIAL_PRICING['deepseek-v4-flash'], {
      version: '2026-08-31',
      model: 'deepseek-v4-flash',
      inputUsdPerMillion: 0.44,
      outputUsdPerMillion: 1.32,
      sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing/',
      verifiedOn: '2026-08-31',
    })
    assert.deepEqual(OFFICIAL_PRICING['deepseek-v4-pro'], {
      version: '2026-08-31',
      model: 'deepseek-v4-pro',
      inputUsdPerMillion: 1.32,
      outputUsdPerMillion: 3.96,
      sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing/',
      verifiedOn: '2026-08-31',
    })
  })

  test('computes the Flash USD, CNY, and official multiplier values', () => {
    const displayed = computeDisplayedPrice(0.4, 3, 7.2, flash)

    assert.ok(displayed)
    assertClose(displayed.systemInputUsd, 0.8)
    assertClose(displayed.systemOutputUsd, 2.4)
    assertClose(displayed.systemInputCny, 5.76)
    assertClose(displayed.systemOutputCny, 17.28)
    assertClose(displayed.effectiveOfficialMultiplier, 0.8 / 0.44)
  })

  test('computes Pro CNY prices', () => {
    const displayed = computeDisplayedPrice(0.92, 3, 7.2, pro)

    assert.ok(displayed)
    assertClose(displayed.systemInputCny, 13.248)
    assertClose(displayed.systemOutputCny, 39.744)
  })

  test('recomputes Flash and Pro prices with the live 7.3 exchange rate', () => {
    const flashDisplayed = computeDisplayedPrice(0.4, 3, 7.3, flash)
    const proDisplayed = computeDisplayedPrice(0.92, 3, 7.3, pro)

    assert.ok(flashDisplayed)
    assert.ok(proDisplayed)
    assertClose(flashDisplayed.systemInputCny, 5.84)
    assertClose(flashDisplayed.systemOutputCny, 17.52)
    assertClose(proDisplayed.systemInputCny, 13.432)
    assertClose(proDisplayed.systemOutputCny, 40.296)
  })

  test('does not resolve prototype names as official prices', () => {
    for (const modelName of ['constructor', '__proto__', 'toString']) {
      assert.equal(getOfficialPrice(modelName), undefined)
    }
  })

  test('does not synthesize an official price for an unknown model', () => {
    assert.equal(OFFICIAL_PRICING['unknown-model'], undefined)
  })

  test('returns null for a non-positive exchange rate', () => {
    assert.equal(computeDisplayedPrice(0.4, 3, 0, flash), null)
    assert.equal(computeDisplayedPrice(0.4, 3, -7.2, flash), null)
  })

  test('returns null for an invalid official price', () => {
    assert.equal(
      computeDisplayedPrice(0.4, 3, 7.2, {
        ...flash,
        inputUsdPerMillion: 0,
      }),
      null
    )
    assert.equal(
      computeDisplayedPrice(0.4, 3, 7.2, {
        ...flash,
        outputUsdPerMillion: Number.NaN,
      }),
      null
    )
  })

  test('returns null for non-finite inputs and arithmetic overflow', () => {
    assert.equal(computeDisplayedPrice(Number.NaN, 3, 7.2, flash), null)
    assert.equal(computeDisplayedPrice(0.4, Number.POSITIVE_INFINITY, 7.2, flash), null)
    assert.equal(computeDisplayedPrice(0.4, 3, Number.POSITIVE_INFINITY, flash), null)
    assert.equal(
      computeDisplayedPrice(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, flash),
      null
    )
  })
})
