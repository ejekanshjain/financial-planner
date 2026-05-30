import { describe, expect, it } from 'vitest'
import {
  CRORE,
  Goal,
  GOAL_DEFAULTS,
  calcGoal,
  inr,
  inrWords,
  logSliderToValue,
  makeGoal,
  MAX_TARGET,
  valueToLogSlider
} from './goals'

/** Build a Goal from the shared defaults, overriding only what a test cares about. */
function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'test',
    name: 'Test goal',
    icon: '🎯',
    createdAt: 0,
    ...GOAL_DEFAULTS,
    ...overrides
  }
}

/** Assert two numbers are equal within a relative tolerance (good for large ₹ sums). */
function expectClose(actual: number, expected: number, rel = 1e-9) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    Math.abs(expected) * rel + 1e-6
  )
}

/** Closed-form future-value factor for a level (no step-up) annuity-due SIP. */
function annuityDueFactor(annualReturn: number, years: number) {
  const r = annualReturn / 100 / 12
  const n = Math.round(years * 12)
  return ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
}

describe('calcGoal — solving for the monthly SIP', () => {
  it('produces a plan whose simulated final value reaches the target', () => {
    // The whole point of the solver: investing `monthlySip` must land on target.
    const configs: Partial<Goal>[] = [
      { target: 1 * CRORE, years: 10, annualReturn: 12, stepUp: 0 },
      { target: 5 * CRORE, years: 20, annualReturn: 11, stepUp: 10 },
      { target: 50e5, years: 5, annualReturn: 9, stepUp: 5, lumpSum: 5e5 },
      // Lump sum kept well under target so the SIP still does the work — the
      // overshoot case is covered separately under "edge cases".
      { target: 2 * CRORE, years: 30, annualReturn: 13, stepUp: 15, lumpSum: 2e5 }
    ]
    for (const cfg of configs) {
      const c = calcGoal(goal(cfg))
      const finalValue = c.series.at(-1)!.value
      expectClose(finalValue, c.nominalTarget, 1e-6)
    }
  })

  it('matches the closed-form annuity-due SIP when step-up is zero', () => {
    const g = goal({ target: 1 * CRORE, years: 10, annualReturn: 12, stepUp: 0 })
    const c = calcGoal(g)
    const expected = (1 * CRORE) / annuityDueFactor(12, 10)
    expectClose(c.monthlySip, expected, 1e-9)
  })

  it('emits one series point per year with ascending years and invested totals', () => {
    const c = calcGoal(goal({ years: 10, stepUp: 0 }))
    expect(c.series).toHaveLength(10)
    expect(c.series.map(p => p.year)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    for (let i = 1; i < c.series.length; i++) {
      expect(c.series[i]!.value).toBeGreaterThan(c.series[i - 1]!.value)
      expect(c.series[i]!.invested).toBeGreaterThan(c.series[i - 1]!.invested)
    }
  })

  it('tracks invested as lump sum plus every monthly contribution', () => {
    const g = goal({ years: 10, stepUp: 0, lumpSum: 2e5 })
    const c = calcGoal(g)
    // With no step-up, invested = lumpSum + monthlySip * months.
    expectClose(c.invested, 2e5 + c.monthlySip * 120, 1e-9)
    expectClose(c.gain, c.nominalTarget - c.invested, 1e-6)
  })

  it('requires a larger SIP for a shorter horizon, all else equal', () => {
    const short = calcGoal(goal({ years: 5 }))
    const long = calcGoal(goal({ years: 15 }))
    expect(short.monthlySip).toBeGreaterThan(long.monthlySip)
  })

  it('lowers the required SIP when an upfront lump sum is provided', () => {
    const without = calcGoal(goal({ lumpSum: 0 }))
    const withLump = calcGoal(goal({ lumpSum: 10e5 }))
    expect(withLump.monthlySip).toBeLessThan(without.monthlySip)
    expectClose(
      withLump.lumpFutureValue,
      10e5 * (1 + 12 / 100 / 12) ** 120,
      1e-9
    )
  })

  describe('step-up', () => {
    it('ramps the last-year monthly above the starting monthly', () => {
      const c = calcGoal(goal({ years: 10, stepUp: 10 }))
      // 10% step-up over 9 increments compounds the first-year amount.
      expectClose(c.lastYearMonthly, c.monthlySip * 1.1 ** 9, 1e-9)
      expect(c.lastYearMonthly).toBeGreaterThan(c.monthlySip)
    })

    it('starts with a smaller SIP than a level plan for the same target', () => {
      const level = calcGoal(goal({ stepUp: 0 }))
      const stepped = calcGoal(goal({ stepUp: 10 }))
      expect(stepped.monthlySip).toBeLessThan(level.monthlySip)
    })
  })

  describe('inflation', () => {
    it('grosses the target up to nominal terms when inflateTarget is set', () => {
      const c = calcGoal(
        goal({ target: 1 * CRORE, years: 10, inflation: 6, inflateTarget: true })
      )
      expectClose(c.nominalTarget, 1 * CRORE * 1.06 ** 10, 1e-9)
      // Discounting the nominal target back returns the original today's-money figure.
      expectClose(c.todayValue, 1 * CRORE, 1e-6)
    })

    it('leaves the target nominal when inflateTarget is false', () => {
      const c = calcGoal(
        goal({ target: 1 * CRORE, inflation: 6, inflateTarget: false })
      )
      expect(c.nominalTarget).toBe(1 * CRORE)
    })

    it('reports erosion of purchasing power, and none at zero inflation', () => {
      const eroded = calcGoal(goal({ inflation: 6, years: 10 }))
      expect(eroded.erodedPct).toBeGreaterThan(0)
      expect(eroded.erodedPct).toBeLessThan(100)

      const flat = calcGoal(goal({ inflation: 0, years: 10 }))
      expectClose(flat.erodedPct, 0, 1e-9)
      expectClose(flat.todayValue, flat.nominalTarget, 1e-9)
    })
  })

  describe('edge cases', () => {
    it('needs no SIP when a lump sum already overshoots the target', () => {
      const c = calcGoal(
        goal({ target: 1 * CRORE, years: 10, annualReturn: 12, lumpSum: 1 * CRORE })
      )
      expect(c.monthlySip).toBe(0)
      // Plan ends on the (overshooting) compounded lump sum, not the target.
      const finalValue = c.series.at(-1)!.value
      expect(finalValue).toBeGreaterThan(c.nominalTarget)
      expectClose(c.gain, finalValue - 1 * CRORE, 1e-6)
    })

    it('clamps to at least one month for a sub-year horizon', () => {
      const c = calcGoal(goal({ years: 0 }))
      expect(c.series.length).toBeGreaterThanOrEqual(1)
      expect(Number.isFinite(c.monthlySip)).toBe(true)
    })

    it('treats a negative lump sum as zero', () => {
      const negative = calcGoal(goal({ lumpSum: -5e5 }))
      const zero = calcGoal(goal({ lumpSum: 0 }))
      expectClose(negative.monthlySip, zero.monthlySip, 1e-9)
      expect(negative.lumpFutureValue).toBe(0)
    })
  })
})

describe('makeGoal', () => {
  it('merges defaults with overrides and stamps an id', () => {
    const g = makeGoal('Retirement', '🏖️', { target: 5 * CRORE, years: 25 })
    expect(g.name).toBe('Retirement')
    expect(g.icon).toBe('🏖️')
    expect(g.target).toBe(5 * CRORE)
    expect(g.years).toBe(25)
    expect(g.annualReturn).toBe(GOAL_DEFAULTS.annualReturn)
    expect(g.id).toBeTruthy()
    expect(typeof g.createdAt).toBe('number')
  })
})

describe('log-scale slider conversions', () => {
  it('maps the slider endpoints to the value bounds', () => {
    expect(logSliderToValue(0)).toBe(0)
    expect(logSliderToValue(1)).toBe(1e5)
    expect(logSliderToValue(1000)).toBe(MAX_TARGET)
    expect(valueToLogSlider(0)).toBe(0)
  })

  it('is monotonic: a higher slider position yields a larger value', () => {
    let prev = logSliderToValue(1)
    for (let pos = 100; pos <= 1000; pos += 100) {
      const v = logSliderToValue(pos)
      expect(v).toBeGreaterThan(prev)
      prev = v
    }
  })

  it('round-trips a value back to a close value', () => {
    for (const value of [5e5, 1e6, 5e6, 1 * CRORE, 5 * CRORE, 25 * CRORE]) {
      const back = logSliderToValue(valueToLogSlider(value))
      // The slider rounds to a few significant figures, so allow a small drift.
      expectClose(back, value, 0.03)
    }
  })
})

describe('inr — full-precision Indian formatting', () => {
  it('groups digits in the Indian lakh/crore style', () => {
    expect(inr(1234567)).toBe('₹12,34,567')
    expect(inr(100000)).toBe('₹1,00,000')
    expect(inr(0)).toBe('₹0')
  })

  it('rounds fractional rupees and guards against non-finite input', () => {
    expect(inr(1234.6)).toBe('₹1,235')
    expect(inr(NaN)).toBe('₹0')
    expect(inr(Infinity)).toBe('₹0')
  })
})

describe('inrWords — compact lakh/crore labels', () => {
  it('labels crores, lakhs and thousands', () => {
    expect(inrWords(1 * CRORE)).toBe('₹1 Cr')
    expect(inrWords(12345678)).toBe('₹1.23 Cr')
    expect(inrWords(50e5)).toBe('₹50 L')
    expect(inrWords(1500)).toBe('₹1.5 K')
  })

  it('falls back to full formatting below a thousand', () => {
    expect(inrWords(999)).toBe('₹999')
    expect(inrWords(0)).toBe('₹0')
  })

  it('returns ₹0 for non-finite input', () => {
    expect(inrWords(NaN)).toBe('₹0')
  })

  it('drops trailing zeros after the decimal', () => {
    expect(inrWords(1.5 * CRORE)).toBe('₹1.5 Cr')
    expect(inrWords(1.2 * CRORE)).toBe('₹1.2 Cr')
    expect(inrWords(2 * CRORE)).toBe('₹2 Cr')
    expect(inrWords(2.5e5)).toBe('₹2.5 L')
  })
})
