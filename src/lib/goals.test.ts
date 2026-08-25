import { describe, expect, it } from 'vitest'
import {
  CRORE,
  Goal,
  calcGoal,
  calcSwp,
  formatYearsMonths,
  logSliderToValue,
  makeGoal,
  valueToLogSlider
} from './goals'
import { profileFor } from './locale'

const IN_DEFAULTS = profileFor({ region: 'IN', currency: 'INR' }).defaults
const IN_LOG_MIN = 1e5
const IN_LOG_MAX = 100 * CRORE

/** Build a Goal from Indian planning defaults, overriding only what a test cares about. */
function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'test',
    name: 'Test goal',
    icon: '🎯',
    createdAt: 0,
    ...IN_DEFAULTS,
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
      {
        target: 2 * CRORE,
        years: 30,
        annualReturn: 13,
        stepUp: 15,
        lumpSum: 2e5
      }
    ]
    for (const cfg of configs) {
      const c = calcGoal(goal(cfg))
      const finalValue = c.series.at(-1)!.value
      expectClose(finalValue, c.nominalTarget, 1e-6)
    }
  })

  it('matches the closed-form annuity-due SIP when step-up is zero', () => {
    const g = goal({
      target: 1 * CRORE,
      years: 10,
      annualReturn: 12,
      stepUp: 0
    })
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
        goal({
          target: 1 * CRORE,
          years: 10,
          inflation: 6,
          inflateTarget: true
        })
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
        goal({
          target: 1 * CRORE,
          years: 10,
          annualReturn: 12,
          lumpSum: 1 * CRORE
        })
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

describe('calcGoal — SIP-driven (forward) mode', () => {
  it('projects the corpus a level SIP grows into (matches the annuity-due FV)', () => {
    const g = goal({
      mode: 'sip',
      monthlySip: 25000,
      years: 10,
      annualReturn: 12,
      stepUp: 0
    })
    const c = calcGoal(g)
    // nominalTarget is now an output: monthlySip × annuity-due factor.
    expectClose(c.nominalTarget, 25000 * annuityDueFactor(12, 10), 1e-6)
    // The reported SIP is exactly what the user entered.
    expect(c.monthlySip).toBe(25000)
    // And the simulated final value equals the projected corpus.
    expectClose(c.series.at(-1)!.value, c.nominalTarget, 1e-9)
  })

  it('adds the compounded lump sum on top of the SIP corpus', () => {
    const withoutLump = calcGoal(goal({ mode: 'sip', monthlySip: 20000 }))
    const withLump = calcGoal(
      goal({ mode: 'sip', monthlySip: 20000, lumpSum: 5e5 })
    )
    expect(withLump.nominalTarget).toBeGreaterThan(withoutLump.nominalTarget)
    expectClose(
      withLump.nominalTarget - withoutLump.nominalTarget,
      withLump.lumpFutureValue,
      1e-6
    )
  })

  it('grows the corpus when the SIP, step-up or horizon increases', () => {
    const base = calcGoal(goal({ mode: 'sip', monthlySip: 10000 }))
    expect(
      calcGoal(goal({ mode: 'sip', monthlySip: 20000 })).nominalTarget
    ).toBeGreaterThan(base.nominalTarget)
    expect(
      calcGoal(goal({ mode: 'sip', monthlySip: 10000, stepUp: 20 }))
        .nominalTarget
    ).toBeGreaterThan(base.nominalTarget)
    expect(
      calcGoal(goal({ mode: 'sip', monthlySip: 10000, years: 20 }))
        .nominalTarget
    ).toBeGreaterThan(base.nominalTarget)
  })

  it('reports the corpus in today’s purchasing power', () => {
    const c = calcGoal(
      goal({ mode: 'sip', monthlySip: 25000, years: 10, inflation: 6 })
    )
    expectClose(c.todayValue, c.nominalTarget / 1.06 ** 10, 1e-9)
    expect(c.todayValue).toBeLessThan(c.nominalTarget)
    expect(c.erodedPct).toBeGreaterThan(0)
  })

  it('ramps the contribution with step-up and tracks invested vs gain', () => {
    const c = calcGoal(
      goal({ mode: 'sip', monthlySip: 10000, years: 10, stepUp: 10 })
    )
    expectClose(c.lastYearMonthly, 10000 * 1.1 ** 9, 1e-9)
    expect(c.invested).toBeGreaterThan(0)
    expectClose(c.gain, c.nominalTarget - c.invested, 1e-6)
    expect(c.gain).toBeGreaterThan(0)
  })

  it('yields a zero corpus (ignoring lump) when the SIP is zero', () => {
    const c = calcGoal(goal({ mode: 'sip', monthlySip: 0, lumpSum: 0 }))
    expectClose(c.nominalTarget, 0, 1e-9)
    expect(c.monthlySip).toBe(0)
  })

  it('defaults a goal with no mode to the target-driven plan', () => {
    // Backward compatibility: pre-mode stored goals must still solve for the SIP.
    const legacy = {
      ...goal({ target: 1 * CRORE, years: 10, stepUp: 0 })
    } as Goal
    // Strip mode to mimic an old export.
    delete (legacy as Partial<Goal>).mode
    const c = calcGoal(legacy)
    expect(c.nominalTarget).toBe(1 * CRORE)
    expectClose(c.monthlySip, (1 * CRORE) / annuityDueFactor(12, 10), 1e-9)
  })
})

describe('calcSwp — systematic withdrawal (decumulation)', () => {
  // In SWP mode `target` is the corpus and `monthlySip` is the monthly withdrawal.
  const swpGoal = (o: Partial<Goal> = {}) =>
    goal({ mode: 'swp', target: 2 * CRORE, monthlySip: 50000, ...o })

  it('reports the sustainable withdrawal that empties the corpus at the horizon', () => {
    const base = calcSwp(swpGoal({ years: 25, annualReturn: 8, stepUp: 0 }))
    // Drawing exactly that amount should run the corpus out right around year 25.
    const tuned = calcSwp(
      swpGoal({
        years: 25,
        annualReturn: 8,
        stepUp: 0,
        monthlySip: base.sustainableWithdrawal
      })
    )
    expect(Math.abs(tuned.lastsMonths - 25 * 12)).toBeLessThanOrEqual(1)
    expect(tuned.balanceAtHorizon).toBeLessThan(base.sustainableWithdrawal)
    expect(tuned.depletesBeforeHorizon).toBe(false)
  })

  it('runs out early when withdrawing more than is sustainable', () => {
    const base = calcSwp(swpGoal({ years: 25, annualReturn: 8, stepUp: 0 }))
    const c = calcSwp(
      swpGoal({
        years: 25,
        annualReturn: 8,
        stepUp: 0,
        monthlySip: base.sustainableWithdrawal * 1.5
      })
    )
    expect(c.depletesBeforeHorizon).toBe(true)
    expect(c.lastsMonths).toBeLessThan(25 * 12)
    expect(c.balanceAtHorizon).toBe(0)
  })

  it('leaves money on the table — and can grow — when withdrawing modestly', () => {
    const c = calcSwp(
      swpGoal({
        target: 5 * CRORE,
        monthlySip: 50000,
        years: 10,
        annualReturn: 8,
        stepUp: 0
      })
    )
    expect(c.sustainable).toBe(true)
    expect(c.depletesBeforeHorizon).toBe(false)
    // Returns far outpace the withdrawals, so the corpus is larger at the horizon.
    expect(c.balanceAtHorizon).toBeGreaterThan(c.corpus)
    // No step-up and never depleted → total drawn is exactly the level amount.
    expectClose(c.totalWithdrawn, 50000 * 120, 1e-9)
  })

  it('keeps real income flat when the step-up matches inflation', () => {
    const c = calcSwp(
      swpGoal({ years: 20, stepUp: 6, inflation: 6, monthlySip: 60000 })
    )
    expect(c.lastYearWithdrawal).toBeGreaterThan(c.firstWithdrawal)
    expectClose(c.realLastWithdrawal, c.firstWithdrawal, 1e-9)
  })

  it('treats a long-lasting corpus as sustainable (capped longevity)', () => {
    const c = calcSwp(
      swpGoal({ target: 10 * CRORE, monthlySip: 20000, stepUp: 0 })
    )
    expect(c.sustainable).toBe(true)
    expect(c.lastsMonths).toBe(1200)
  })
})

describe('formatYearsMonths', () => {
  it('humanises month counts', () => {
    expect(formatYearsMonths(300)).toBe('25 years')
    expect(formatYearsMonths(12)).toBe('1 year')
    expect(formatYearsMonths(13)).toBe('1 yr 1 mo')
    expect(formatYearsMonths(1)).toBe('1 month')
    expect(formatYearsMonths(0)).toBe('0 months')
  })
})

describe('makeGoal', () => {
  it('merges defaults with overrides and stamps an id', () => {
    const g = makeGoal(
      'Retirement',
      '🏖️',
      { target: 5 * CRORE, years: 25 },
      IN_DEFAULTS
    )
    expect(g.name).toBe('Retirement')
    expect(g.icon).toBe('🏖️')
    expect(g.target).toBe(5 * CRORE)
    expect(g.years).toBe(25)
    expect(g.annualReturn).toBe(IN_DEFAULTS.annualReturn)
    expect(g.id).toBeTruthy()
    expect(typeof g.createdAt).toBe('number')
  })
})

describe('log-scale slider conversions', () => {
  it('maps the slider endpoints to the value bounds', () => {
    expect(logSliderToValue(0, IN_LOG_MIN, IN_LOG_MAX)).toBe(0)
    expect(logSliderToValue(1, IN_LOG_MIN, IN_LOG_MAX)).toBe(1e5)
    expect(logSliderToValue(1000, IN_LOG_MIN, IN_LOG_MAX)).toBe(IN_LOG_MAX)
    expect(valueToLogSlider(0, IN_LOG_MIN, IN_LOG_MAX)).toBe(0)
  })

  it('is monotonic: a higher slider position yields a larger value', () => {
    let prev = logSliderToValue(1, IN_LOG_MIN, IN_LOG_MAX)
    for (let pos = 100; pos <= 1000; pos += 100) {
      const v = logSliderToValue(pos, IN_LOG_MIN, IN_LOG_MAX)
      expect(v).toBeGreaterThan(prev)
      prev = v
    }
  })

  it('round-trips a value back to a close value', () => {
    for (const value of [5e5, 1e6, 5e6, 1 * CRORE, 5 * CRORE, 25 * CRORE]) {
      const back = logSliderToValue(
        valueToLogSlider(value, IN_LOG_MIN, IN_LOG_MAX),
        IN_LOG_MIN,
        IN_LOG_MAX
      )
      expectClose(back, value, 0.03)
    }
  })
})
