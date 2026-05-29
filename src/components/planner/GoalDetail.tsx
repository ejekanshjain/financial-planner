'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { displayFont } from '~/lib/fonts'
import {
  calcGoal,
  Goal,
  GOAL_ICONS,
  inr,
  inrWords,
  logSliderToValue,
  MAX_TARGET,
  TARGET_PRESETS,
  valueToLogSlider
} from '~/lib/goals'

const FOREST = '#10301d'
const FOREST_SOFT = '#1d4d31'
const CREAM = '#f4efe2'

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n))

/* ── shared Field component ───────────────────────────────── */
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
            onChange={e => {
              setDraft(e.target.value)
              const v = Number(e.target.value.replace(/,/g, ''))
              if (Number.isFinite(v)) onChange(Math.min(v, max))
            }}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className={`w-28 [appearance:textfield] bg-transparent px-3 py-1.5 text-right text-[15px] font-semibold text-[#10301d] tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${displayFont.className}`}
          />
          {suffix && (
            <span className="flex items-center bg-[#10301d]/5 px-2.5 text-[13px] font-medium text-[#10301d]/55">
              {suffix}
            </span>
          )}
        </div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          onChange(Number(e.target.value))
          setDraft(null)
        }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#10301d]/12 accent-[#1d4d31] outline-none"
      />
      {helper && <p className="text-xs text-[#10301d]/45">{helper}</p>}
    </div>
  )
}

/* ── toggle switch ────────────────────────────────────────── */
function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-[#1d4d31]' : 'bg-[#10301d]/20'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
  )
}

/* ── logarithmic money field with a log slider (₹0 – ₹100 Cr) ── */
function MoneyField({
  value,
  onChange,
  width = 'w-32'
}: {
  value: number
  onChange: (n: number) => void
  width?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    const parsed = Number((draft ?? String(value)).replace(/,/g, ''))
    onChange(clamp(Number.isFinite(parsed) ? parsed : 0, 0, MAX_TARGET))
    setDraft(null)
  }

  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-[#10301d]/15 bg-[#fffdf7] focus-within:border-[#b5893a] focus-within:ring-2 focus-within:ring-[#b5893a]/25">
      <input
        type="number"
        inputMode="decimal"
        value={draft ?? value}
        onChange={e => {
          setDraft(e.target.value)
          const v = Number(e.target.value.replace(/,/g, ''))
          if (Number.isFinite(v)) onChange(clamp(v, 0, MAX_TARGET))
        }}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className={`${width} [appearance:textfield] bg-transparent px-3 py-1.5 text-right text-[15px] font-semibold text-[#10301d] tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${displayFont.className}`}
      />
      <span className="flex items-center bg-[#10301d]/5 px-2.5 text-[13px] font-medium text-[#10301d]/55">
        ₹
      </span>
    </div>
  )
}

/* ── target-wealth field (with optional inflation-adjustment) ── */
function TargetField({
  value,
  onChange,
  inflateTarget,
  onToggleInflate,
  years,
  inflation
}: {
  value: number
  onChange: (n: number) => void
  inflateTarget: boolean
  onToggleInflate: (v: boolean) => void
  years: number
  inflation: number
}) {
  const nominal = inflateTarget
    ? value * (1 + inflation / 100) ** years
    : value

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[13px] font-medium tracking-wide text-[#10301d]/80 uppercase">
          {inflateTarget ? 'Target (today’s value)' : 'Target wealth'}
        </label>
        <MoneyField value={value} onChange={onChange} />
      </div>

      {/* inflation-adjust toggle */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-[#10301d]/4 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[#10301d]/75">
            Adjust target for inflation
          </p>
          <p className="text-[11px] text-[#10301d]/45">
            {inflateTarget
              ? `Need ${inrWords(nominal)} in ${years} yrs to match today’s ${inrWords(value)}`
              : 'Enter the amount in today’s money instead'}
          </p>
        </div>
        <Toggle checked={inflateTarget} onChange={onToggleInflate} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TARGET_PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.value)}
            className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              value === p.value
                ? 'bg-[#1d4d31] text-[#f4efe2]'
                : 'border border-[#10301d]/20 text-[#10301d]/55 hover:border-[#1d4d31]/50 hover:text-[#1d4d31]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <input
        type="range"
        value={valueToLogSlider(value)}
        min={0}
        max={1000}
        step={1}
        onChange={e => onChange(logSliderToValue(Number(e.target.value)))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#10301d]/12 accent-[#1d4d31] outline-none"
      />
      <p className="text-xs text-[#10301d]/45">
        {inrWords(value)} · slider up to ₹100 Cr
      </p>
    </div>
  )
}

/* ── lump-sum field ───────────────────────────────────────── */
function LumpSumField({
  value,
  onChange
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[13px] font-medium tracking-wide text-[#10301d]/80 uppercase">
          Existing lump sum
        </label>
        <MoneyField value={value} onChange={onChange} />
      </div>
      <input
        type="range"
        value={valueToLogSlider(value)}
        min={0}
        max={1000}
        step={1}
        onChange={e => onChange(logSliderToValue(Number(e.target.value)))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#10301d]/12 accent-[#1d4d31] outline-none"
      />
      <p className="text-xs text-[#10301d]/45">
        {value > 0
          ? `${inrWords(value)} invested today, growing with this goal`
          : 'A one-time amount you’ve already invested (optional)'}
      </p>
    </div>
  )
}

/* ── stat tile ────────────────────────────────────────────── */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-widest text-[#f4efe2]/55 uppercase">
        {label}
      </p>
      <p className={`mt-1 text-xl text-[#f4efe2] ${displayFont.className}`}>
        {value}
      </p>
    </div>
  )
}

/* ── main component ───────────────────────────────────────── */
export function GoalDetail({
  goal,
  onUpdate,
  onDelete,
  onBack
}: {
  goal: Goal
  onUpdate: (g: Goal) => void
  onDelete: () => void
  onBack: () => void
}) {
  const [name, setName] = useState(goal.name)
  const [icon, setIcon] = useState(goal.icon)
  const [target, setTarget] = useState(goal.target)
  const [years, setYears] = useState(goal.years)
  const [annualReturn, setAnnualReturn] = useState(goal.annualReturn)
  const [stepUp, setStepUp] = useState(goal.stepUp)
  const [inflation, setInflation] = useState(goal.inflation)
  const [lumpSum, setLumpSum] = useState(goal.lumpSum)
  const [inflateTarget, setInflateTarget] = useState(goal.inflateTarget)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingName, setEditingName] = useState(false)

  // stable ref to latest onUpdate
  const onUpdateRef = useRef(onUpdate)
  // eslint-disable-next-line react-hooks/refs
  onUpdateRef.current = onUpdate

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onUpdateRef.current({
      id: goal.id,
      createdAt: goal.createdAt,
      name,
      icon,
      target,
      years,
      annualReturn,
      stepUp,
      inflation,
      lumpSum,
      inflateTarget
    })
  }, [
    name,
    icon,
    target,
    years,
    annualReturn,
    stepUp,
    inflation,
    lumpSum,
    inflateTarget,
    goal.id,
    goal.createdAt
  ])

  const currentGoal = useMemo<Goal>(
    () => ({
      id: goal.id,
      createdAt: goal.createdAt,
      name,
      icon,
      target,
      years,
      annualReturn,
      stepUp,
      inflation,
      lumpSum,
      inflateTarget
    }),
    [
      goal.id,
      goal.createdAt,
      name,
      icon,
      target,
      years,
      annualReturn,
      stepUp,
      inflation,
      lumpSum,
      inflateTarget
    ]
  )
  const calc = useMemo(() => calcGoal(currentGoal), [currentGoal])
  const maxValue = calc.series.at(-1)?.value ?? 1

  const handleIconSelect = useCallback((emoji: string) => {
    setIcon(emoji)
    setShowIconPicker(false)
  }, [])

  return (
    <main
      className="min-h-screen w-full px-5 py-10 sm:px-8 sm:py-14"
      style={{
        background: `radial-gradient(120% 90% at 85% 0%, ${CREAM} 0%, #ece4d2 60%, #e4dac4 100%)`
      }}
    >
      <div className="mx-auto max-w-5xl">
        {/* ── breadcrumb + name ─────────────────────────────── */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-[#10301d]/15 bg-white/60 px-3 py-1.5 text-[13px] text-[#10301d]/60 transition-all hover:border-[#10301d]/30 hover:bg-white/80 hover:text-[#10301d]"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            All Goals
          </button>

          <span className="text-[#10301d]/25">/</span>

          {/* icon button */}
          <div className="relative">
            <button
              onClick={() => setShowIconPicker(v => !v)}
              className="text-3xl leading-none transition-transform hover:scale-110"
              title="Change icon"
            >
              {icon}
            </button>
            {showIconPicker && (
              <div className="absolute top-12 left-0 z-20 flex w-56 flex-wrap gap-2 rounded-xl border border-[#10301d]/10 bg-white p-3 shadow-xl">
                {GOAL_ICONS.map(ic => (
                  <button
                    key={ic.emoji}
                    onClick={() => handleIconSelect(ic.emoji)}
                    title={ic.label}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors ${
                      icon === ic.emoji
                        ? 'bg-[#1d4d31]/15'
                        : 'hover:bg-[#10301d]/8'
                    }`}
                  >
                    {ic.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* editable goal name */}
          {editingName ? (
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => {
                if (e.key === 'Enter') setEditingName(false)
              }}
              autoFocus
              className={`flex-1 border-b-2 border-[#b5893a] bg-transparent text-2xl text-[#10301d] outline-none sm:text-3xl ${displayFont.className}`}
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className={`group flex items-center gap-2 text-2xl text-[#10301d] sm:text-3xl ${displayFont.className}`}
            >
              {name || 'Untitled Goal'}
              <svg
                className="h-4 w-4 shrink-0 text-[#10301d]/25 opacity-0 transition-opacity group-hover:opacity-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          )}

          {/* delete goal */}
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete goal"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#10301d]/15 bg-white/60 text-[#10301d]/40 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {/* ── two-column layout ─────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* inputs */}
          <section className="rounded-2xl border border-[#10301d]/10 bg-[#fffdf7] p-6 shadow-[0_2px_30px_-12px_rgba(16,48,29,0.25)] sm:p-8">
            <h2
              className={`mb-6 text-2xl text-[#10301d] ${displayFont.className}`}
            >
              Your plan
            </h2>
            <div className="space-y-7">
              <TargetField
                value={target}
                onChange={setTarget}
                inflateTarget={inflateTarget}
                onToggleInflate={setInflateTarget}
                years={years}
                inflation={inflation}
              />
              <LumpSumField value={lumpSum} onChange={setLumpSum} />
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

          {/* results */}
          <section className="space-y-6">
            {/* hero SIP */}
            <div
              className="rounded-2xl p-6 text-[#f4efe2] shadow-[0_20px_50px_-20px_rgba(16,48,29,0.6)] sm:p-8"
              style={{
                background: `linear-gradient(155deg, ${FOREST_SOFT} 0%, ${FOREST} 70%)`
              }}
            >
              <p className="text-[11px] font-semibold tracking-[0.25em] text-[#f4efe2]/60 uppercase">
                {calc.monthlySip > 0
                  ? 'Start investing every month'
                  : 'Your lump sum already covers this'}
              </p>
              <p
                className={`mt-2 text-5xl leading-none tracking-tight text-[#f4efe2] sm:text-6xl ${displayFont.className}`}
              >
                {inr(calc.monthlySip)}
              </p>
              {calc.monthlySip > 0 ? (
                <p className="mt-2 text-sm text-[#f4efe2]/70">
                  {inrWords(calc.monthlySip)} per month, then{' '}
                  <span className="font-semibold text-[#d8b877]">
                    +{stepUp}%
                  </span>{' '}
                  a year for {years} years
                  {lumpSum > 0 && (
                    <>
                      , on top of your{' '}
                      <span className="font-semibold text-[#d8b877]">
                        {inrWords(lumpSum)}
                      </span>{' '}
                      lump sum
                    </>
                  )}
                  .
                </p>
              ) : (
                <p className="mt-2 text-sm text-[#f4efe2]/70">
                  Your {inrWords(lumpSum)} lump sum grows to{' '}
                  <span className="font-semibold text-[#d8b877]">
                    {inrWords(calc.lumpFutureValue)}
                  </span>{' '}
                  in {years} years — no monthly SIP needed.
                </p>
              )}
              <div className="mt-7 grid grid-cols-3 gap-4 border-t border-[#f4efe2]/12 pt-6">
                <Stat label="Total invested" value={inrWords(calc.invested)} />
                <Stat label="Wealth gained" value={inrWords(calc.gain)} />
                <Stat
                  label={lumpSum > 0 ? 'Lump sum grows to' : `SIP in yr ${years}`}
                  value={inrWords(
                    lumpSum > 0 ? calc.lumpFutureValue : calc.lastYearMonthly
                  )}
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
                className={`mt-2 text-4xl text-[#10301d] sm:text-5xl ${displayFont.className}`}
              >
                {inr(calc.todayValue)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#10301d]/60">
                {inrWords(calc.nominalTarget)} in {years} years buys what{' '}
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
                <h3
                  className={`text-lg text-[#10301d] ${displayFont.className}`}
                >
                  Year-by-year growth
                </h3>
                <div className="flex items-center gap-4 text-[11px] text-[#10301d]/55">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-[3px] bg-[#1d4d31]" />{' '}
                    Invested
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-[3px] bg-[#b5893a]" />{' '}
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
                      title={`Year ${d.year} · ${inrWords(d.value)} · Invested ${inrWords(d.invested)}`}
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

        {/* ── delete zone ───────────────────────────────────── */}
        <div className="mt-10 flex justify-end">
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[13px] text-[#10301d]/35 transition-colors hover:text-red-400"
          >
            Delete this goal
          </button>
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-[#10301d]/40">
          Estimates assume monthly compounding with contributions at the start
          of each month and an annual step-up. Actual mutual-fund returns vary
          and are not guaranteed.
        </p>
      </div>

      {/* ── delete confirmation modal ─────────────────────────── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm"
          onClick={e => {
            if (e.target === e.currentTarget) setConfirmDelete(false)
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#fffdf7] p-6 text-center shadow-2xl">
            <p className={`text-xl text-[#10301d] ${displayFont.className}`}>
              Delete this goal?
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#10301d]/60">
              &ldquo;{name || 'Untitled Goal'}&rdquo; will be permanently
              removed. This can&rsquo;t be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl bg-[#10301d]/8 py-2.5 text-[14px] font-medium text-[#10301d]/70 transition-colors hover:bg-[#10301d]/15"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
