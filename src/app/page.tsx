'use client'

import { Fraunces } from 'next/font/google'
import { useMemo, useState } from 'react'

const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic']
})

/* ── palette ─────────────────────────────────────────────── */
const FOREST = '#10301d'
const FOREST_SOFT = '#1d4d31'
const CREAM = '#f4efe2'

/* ── limits (target slider tops out at 100 crore) ─────────── */
const CRORE = 1e7
const MAX_TARGET = 100 * CRORE // ₹100 Cr

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

const inr = (n: number) =>
  '₹' +
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
    Math.round(Number.isFinite(n) ? n : 0)
  )

/** Compact Indian words: ₹1.50 Cr, ₹25.00 L, ₹40.00 K */
const inrWords = (n: number) => {
  if (!Number.isFinite(n)) return '₹0'
  const trim = (v: number) => v.toFixed(2).replace(/\.00$/, '')
  if (n >= CRORE) return `₹${trim(n / CRORE)} Cr`
  if (n >= 1e5) return `₹${trim(n / 1e5)} L`
  if (n >= 1e3) return `₹${trim(n / 1e3)} K`
  return inr(n)
}

/* ── one input row: text box + slider, both keyboard driven ─ */
function Field({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  helper
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  step: number
  suffix?: string
  helper?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(value)

  const handleText = (raw: string) => {
    setDraft(raw)
    if (raw.trim() === '') return
    const parsed = Number(raw.replace(/,/g, ''))
    if (!Number.isFinite(parsed)) return
    // only cap the ceiling while typing so partial entries aren't fought
    onChange(Math.min(parsed, max))
  }

  const commit = () => {
    const parsed = Number((draft ?? String(value)).replace(/,/g, ''))
    onChange(clamp(Number.isFinite(parsed) ? parsed : min, min, max))
    setDraft(null)
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[13px] font-medium tracking-wide text-[#10301d]/80 uppercase">
          {label}
        </label>
        <div className="flex items-stretch overflow-hidden rounded-md border border-[#10301d]/15 bg-[#fffdf7] focus-within:border-[#b5893a] focus-within:ring-2 focus-within:ring-[#b5893a]/25">
          <input
            type="number"
            inputMode="decimal"
            value={shown}
            min={min}
            max={max}
            step={step}
            onChange={e => handleText(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className={`w-32 [appearance:textfield] bg-transparent px-3 py-1.5 text-right text-[15px] font-semibold text-[#10301d] tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${display.className}`}
          />
          {suffix ? (
            <span className="flex items-center bg-[#10301d]/5 px-2.5 text-[13px] font-medium text-[#10301d]/55">
              {suffix}
            </span>
          ) : null}
        </div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#10301d]/12 accent-[#1d4d31] outline-none"
      />
      {helper ? <p className="text-xs text-[#10301d]/45">{helper}</p> : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-widest text-[#f4efe2]/55 uppercase">
        {label}
      </p>
      <p className={`mt-1 text-xl text-[#f4efe2] ${display.className}`}>
        {value}
      </p>
    </div>
  )
}

export default function StepUpSipCalculator() {
  const [years, setYears] = useState(20)
  const [annualReturn, setAnnualReturn] = useState(12)
  const [stepUp, setStepUp] = useState(10)
  const [target, setTarget] = useState(5 * CRORE)
  const [inflation, setInflation] = useState(6)

  const calc = useMemo(() => {
    const monthlyRate = annualReturn / 100 / 12
    const stepFactor = 1 + stepUp / 100
    const months = Math.max(1, Math.round(years * 12))

    // Future value of ₹1 starting monthly SIP, stepped up each year,
    // invested at the start of every month (annuity-due).
    let factor = 0
    for (let m = 1; m <= months; m++) {
      const yearIdx = Math.floor((m - 1) / 12)
      factor = (factor + stepFactor ** yearIdx) * (1 + monthlyRate)
    }

    const monthlySip = factor > 0 ? target / factor : 0

    // Replay with the real SIP to gather totals + a yearly series.
    let bal = 0
    let invested = 0
    const series: { year: number; invested: number; value: number }[] = []
    for (let m = 1; m <= months; m++) {
      const yearIdx = Math.floor((m - 1) / 12)
      const contrib = monthlySip * stepFactor ** yearIdx
      invested += contrib
      bal = (bal + contrib) * (1 + monthlyRate)
      if (m % 12 === 0 || m === months)
        series.push({ year: Math.ceil(m / 12), invested, value: bal })
    }

    const lastYearMonthly = monthlySip * stepFactor ** Math.max(0, years - 1)
    const gain = target - invested

    // Reverse inflation: what is the target worth in today's money?
    const todayValue = target / (1 + inflation / 100) ** years
    const erodedPct = target > 0 ? (1 - todayValue / target) * 100 : 0

    return {
      monthlySip,
      invested,
      gain,
      lastYearMonthly,
      todayValue,
      erodedPct,
      series
    }
  }, [years, annualReturn, stepUp, target, inflation])

  const maxValue = calc.series.at(-1)?.value ?? 1

  return (
    <main
      className="min-h-screen w-full px-5 py-12 sm:px-8 sm:py-16"
      style={{
        background: `radial-gradient(120% 90% at 85% 0%, ${CREAM} 0%, #ece4d2 60%, #e4dac4 100%)`
      }}
    >
      <div className="mx-auto max-w-5xl">
        {/* ── header ───────────────────────────────────────── */}
        <header className="mb-10 max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-[#b5893a] uppercase">
            <span className="h-px w-8 bg-[#b5893a]" />
            Wealth Planner
          </p>
          <h1
            className={`text-4xl leading-[1.05] text-[#10301d] sm:text-5xl ${display.className}`}
          >
            Step-Up SIP{' '}
            <span className="text-[#b5893a] italic">Calculator</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#10301d]/65">
            Set the wealth you want to retire with and we&rsquo;ll solve for the
            monthly SIP to begin today &mdash; growing it a little each year so
            your contributions rise with your income.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── inputs ─────────────────────────────────────── */}
          <section className="rounded-2xl border border-[#10301d]/10 bg-[#fffdf7] p-6 shadow-[0_2px_30px_-12px_rgba(16,48,29,0.25)] sm:p-8">
            <h2 className={`mb-6 text-2xl text-[#10301d] ${display.className}`}>
              Your plan
            </h2>
            <div className="space-y-7">
              <Field
                label="Target wealth"
                value={target}
                onChange={setTarget}
                min={0}
                max={MAX_TARGET}
                step={1e5}
                suffix="₹"
                helper={`${inrWords(target)} · slider up to ₹100 Cr`}
              />
              <Field
                label="Years to goal"
                value={years}
                onChange={n => setYears(Math.round(n))}
                min={1}
                max={50}
                step={1}
                suffix="yrs"
              />
              <Field
                label="Expected return"
                value={annualReturn}
                onChange={setAnnualReturn}
                min={1}
                max={30}
                step={0.5}
                suffix="% p.a."
                helper="Equity mutual funds have historically averaged ~12% over the long run."
              />
              <Field
                label="Annual step-up"
                value={stepUp}
                onChange={setStepUp}
                min={0}
                max={50}
                step={1}
                suffix="% / yr"
                helper="How much you raise the monthly SIP every year."
              />
              <Field
                label="Inflation"
                value={inflation}
                onChange={setInflation}
                min={0}
                max={15}
                step={0.5}
                suffix="% p.a."
                helper="Used to find today's purchasing power of your target."
              />
            </div>
          </section>

          {/* ── results ────────────────────────────────────── */}
          <section className="space-y-6">
            {/* hero: required SIP */}
            <div
              className="rounded-2xl p-6 text-[#f4efe2] shadow-[0_20px_50px_-20px_rgba(16,48,29,0.6)] sm:p-8"
              style={{
                background: `linear-gradient(155deg, ${FOREST_SOFT} 0%, ${FOREST} 70%)`
              }}
            >
              <p className="text-[11px] font-semibold tracking-[0.25em] text-[#f4efe2]/60 uppercase">
                Start investing every month
              </p>
              <p
                className={`mt-2 text-5xl leading-none tracking-tight text-[#f4efe2] sm:text-6xl ${display.className}`}
              >
                {inr(calc.monthlySip)}
              </p>
              <p className="mt-2 text-sm text-[#f4efe2]/70">
                {inrWords(calc.monthlySip)} per month, then{' '}
                <span className="font-semibold text-[#d8b877]">+{stepUp}%</span>{' '}
                a year for {years} years.
              </p>

              <div className="mt-7 grid grid-cols-3 gap-4 border-t border-[#f4efe2]/12 pt-6">
                <Stat label="Total invested" value={inrWords(calc.invested)} />
                <Stat label="Wealth gained" value={inrWords(calc.gain)} />
                <Stat
                  label={`SIP in yr ${years}`}
                  value={inrWords(calc.lastYearMonthly)}
                />
              </div>
            </div>

            {/* purchasing power */}
            <div className="rounded-2xl border-2 border-dashed border-[#b5893a]/45 bg-[#fffdf7] p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-[0.25em] text-[#b5893a] uppercase">
                  Today&rsquo;s purchasing power
                </p>
                <span className="rounded-full bg-[#b5893a]/12 px-2.5 py-1 text-[11px] font-semibold text-[#8a6722]">
                  @ {inflation}% inflation
                </span>
              </div>
              <p
                className={`mt-2 text-4xl text-[#10301d] sm:text-5xl ${display.className}`}
              >
                {inr(calc.todayValue)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#10301d]/60">
                {inrWords(target)} in {years} years buys what{' '}
                <span className="font-semibold text-[#10301d]">
                  {inrWords(calc.todayValue)}
                </span>{' '}
                buys today &mdash; inflation erodes about{' '}
                <span className="font-semibold text-[#a23b2b]">
                  {calc.erodedPct.toFixed(0)}%
                </span>{' '}
                of its value.
              </p>
            </div>

            {/* growth chart */}
            <div className="rounded-2xl border border-[#10301d]/10 bg-[#fffdf7] p-6 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <h3 className={`text-lg text-[#10301d] ${display.className}`}>
                  Year-by-year growth
                </h3>
                <div className="flex items-center gap-4 text-[11px] text-[#10301d]/55">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#1d4d31]" />
                    Invested
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#b5893a]" />
                    Returns
                  </span>
                </div>
              </div>
              <div className="flex h-40 items-end gap-0.75">
                {calc.series.map(d => {
                  const h = (d.value / maxValue) * 100
                  const investedPct =
                    d.value > 0 ? (d.invested / d.value) * 100 : 0
                  return (
                    <div
                      key={d.year}
                      className="group relative flex flex-1 flex-col justify-end"
                      style={{ height: '100%' }}
                      title={`Year ${d.year} · Value ${inrWords(
                        d.value
                      )} · Invested ${inrWords(d.invested)}`}
                    >
                      <div
                        className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px] transition-opacity group-hover:opacity-80"
                        style={{ height: `${h}%` }}
                      >
                        <div
                          className="w-full bg-[#1d4d31]"
                          style={{ height: `${investedPct}%` }}
                        />
                        <div
                          className="w-full bg-[#b5893a]"
                          style={{ height: `${100 - investedPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-[#10301d]/40">
                <span>Yr 1</span>
                <span>Yr {years}</span>
              </div>
            </div>
          </section>
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-[#10301d]/40">
          Estimates assume monthly compounding with contributions at the start
          of each month and an annual step-up. Actual mutual-fund returns vary
          and are not guaranteed.
        </p>
      </div>
    </main>
  )
}
