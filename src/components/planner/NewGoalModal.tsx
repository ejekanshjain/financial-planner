'use client'

import { useEffect, useState } from 'react'
import {
  Goal,
  GoalMode,
  GOAL_ICONS,
  GOAL_DEFAULTS,
  TARGET_PRESETS,
  SIP_PRESETS,
  SIP_SLIDER_MAX,
  SWP_DEFAULTS,
  makeGoal,
  logSliderToValue,
  valueToLogSlider,
  inrWords,
  MAX_SIP,
  MAX_TARGET,
} from '~/lib/goals'
import { displayFont } from '~/lib/fonts'

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/* ── lump-amount field: ₹ suffix, presets, log slider (target / corpus) ── */
function AmountField({
  label,
  value,
  onChange,
  helper
}: {
  label: string
  value: number
  onChange: (n: number) => void
  helper: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    const parsed = Number((draft ?? String(value)).replace(/,/g, ''))
    onChange(clamp(Number.isFinite(parsed) ? parsed : value, 0, MAX_TARGET))
    setDraft(null)
  }
  return (
    <div className="mt-5 space-y-2.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[12px] font-semibold tracking-widest text-[#10301d]/55 uppercase">
          {label}
        </label>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-[#10301d]/15 bg-white focus-within:border-[#b5893a] focus-within:ring-2 focus-within:ring-[#b5893a]/25">
          <input
            type="number"
            aria-label={label}
            value={draft ?? value}
            onChange={e => {
              setDraft(e.target.value)
              const v = Number(e.target.value.replace(/,/g, ''))
              if (Number.isFinite(v)) onChange(Math.min(v, MAX_TARGET))
            }}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className="w-28 [appearance:textfield] bg-transparent px-3 py-1.5 text-right text-[14px] font-semibold text-[#10301d] tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="flex items-center bg-[#10301d]/5 px-2 text-[12px] font-medium text-[#10301d]/50">
            ₹
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TARGET_PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              onChange(p.value)
              setDraft(null)
            }}
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
        aria-label={`${label} slider`}
        value={valueToLogSlider(value)}
        min={0}
        max={1000}
        step={1}
        onChange={e => {
          onChange(logSliderToValue(Number(e.target.value)))
          setDraft(null)
        }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#10301d]/12 accent-[#1d4d31] outline-none"
      />
      <p className="text-[11px] text-[#10301d]/40">{helper}</p>
    </div>
  )
}

/* ── monthly-amount field: ₹ prefix + /mo, presets, linear slider (SIP / withdrawal) ── */
function MonthlyField({
  label,
  value,
  onChange,
  helper
}: {
  label: string
  value: number
  onChange: (n: number) => void
  helper: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    const parsed = Number((draft ?? String(value)).replace(/,/g, ''))
    onChange(clamp(Number.isFinite(parsed) ? parsed : value, 0, MAX_SIP))
    setDraft(null)
  }
  return (
    <div className="mt-5 space-y-2.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[12px] font-semibold tracking-widest text-[#10301d]/55 uppercase">
          {label}
        </label>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-[#10301d]/15 bg-white focus-within:border-[#b5893a] focus-within:ring-2 focus-within:ring-[#b5893a]/25">
          <span className="flex items-center bg-[#10301d]/5 px-2 text-[12px] font-medium text-[#10301d]/50">
            ₹
          </span>
          <input
            type="number"
            aria-label={`${label} amount`}
            value={draft ?? value}
            onChange={e => {
              setDraft(e.target.value)
              const v = Number(e.target.value.replace(/,/g, ''))
              if (Number.isFinite(v)) onChange(Math.min(v, MAX_SIP))
            }}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className="w-24 [appearance:textfield] bg-transparent px-3 py-1.5 text-right text-[14px] font-semibold text-[#10301d] tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="flex items-center bg-[#10301d]/5 px-2 text-[12px] font-medium text-[#10301d]/50">
            / mo
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SIP_PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              onChange(p.value)
              setDraft(null)
            }}
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
        aria-label={`${label} slider`}
        value={Math.min(value, SIP_SLIDER_MAX)}
        min={0}
        max={SIP_SLIDER_MAX}
        step={500}
        onChange={e => {
          onChange(Number(e.target.value))
          setDraft(null)
        }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#10301d]/12 accent-[#1d4d31] outline-none"
      />
      <p className="text-[11px] text-[#10301d]/40">{helper}</p>
    </div>
  )
}

export function NewGoalModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (goal: Goal) => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [mode, setMode] = useState<GoalMode>('target')
  const [target, setTarget] = useState(GOAL_DEFAULTS.target)
  const [monthlySip, setMonthlySip] = useState(GOAL_DEFAULTS.monthlySip)
  const [years, setYears] = useState(GOAL_DEFAULTS.years)
  // true while `name` holds an auto-filled label from an icon click (not user-typed)
  const [nameIsAuto, setNameIsAuto] = useState(false)

  // Switching into withdrawal mode seeds friendlier decumulation defaults.
  const handleMode = (m: GoalMode) => {
    if (m === 'swp' && mode !== 'swp') {
      setTarget(SWP_DEFAULTS.corpus)
      setMonthlySip(SWP_DEFAULTS.withdrawal)
      setYears(SWP_DEFAULTS.years)
    }
    setMode(m)
  }

  // Escape closes the modal, matching the backdrop-click behaviour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const pickIcon = (ic: { emoji: string; label: string }) => {
    setIcon(ic.emoji)
    // fill the name from the icon when the box is empty or still holds an auto value
    if (!name.trim() || nameIsAuto) {
      setName(ic.label)
      setNameIsAuto(true)
    }
  }

  const handleCreate = () => {
    if (!name.trim()) return
    const overrides: Partial<Goal> =
      mode === 'sip'
        ? { mode, monthlySip, years }
        : mode === 'swp'
          ? {
              mode,
              target,
              monthlySip,
              years,
              annualReturn: SWP_DEFAULTS.annualReturn,
              stepUp: SWP_DEFAULTS.stepUp
            }
          : { mode, target, years }
    onCreate(makeGoal(name.trim(), icon, overrides))
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-goal-title"
        className="w-full max-w-md rounded-t-3xl bg-[#fffdf7] p-6 shadow-2xl sm:rounded-2xl sm:p-8"
      >
        {/* header */}
        <div className="mb-6 flex items-center justify-between">
          <h2
            id="new-goal-title"
            className={`text-xl text-[#10301d] ${displayFont.className}`}
          >
            New Goal
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10301d]/8 text-[#10301d]/50 transition-colors hover:bg-[#10301d]/15"
          >
            ✕
          </button>
        </div>

        {/* name */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold tracking-widest text-[#10301d]/55 uppercase">
            Goal name
          </label>
          <input
            type="text"
            placeholder="Dream House, Family Car, World Tour…"
            value={name}
            onChange={e => {
              setName(e.target.value)
              setNameIsAuto(false)
            }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
            className="w-full rounded-xl border border-[#10301d]/15 bg-white px-4 py-2.5 text-[15px] text-[#10301d] placeholder:text-[#10301d]/30 outline-none transition focus:border-[#b5893a] focus:ring-2 focus:ring-[#b5893a]/25"
          />
        </div>

        {/* icon picker */}
        <div className="mt-5 space-y-2">
          <label className="text-[12px] font-semibold tracking-widest text-[#10301d]/55 uppercase">
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map(ic => (
              <button
                key={ic.emoji}
                type="button"
                onClick={() => pickIcon(ic)}
                title={ic.label}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${
                  icon === ic.emoji
                    ? 'bg-[#1d4d31] ring-2 ring-[#1d4d31]/30 ring-offset-1 scale-110'
                    : 'bg-[#10301d]/6 hover:bg-[#10301d]/12'
                }`}
              >
                {ic.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* planning mode */}
        <div className="mt-5 space-y-2">
          <label className="text-[12px] font-semibold tracking-widest text-[#10301d]/55 uppercase">
            Plan by
          </label>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#10301d]/6 p-1">
            {(
              [
                { value: 'target', label: 'Target' },
                { value: 'sip', label: 'SIP' },
                { value: 'swp', label: 'Withdraw' }
              ] as { value: GoalMode; label: string }[]
            ).map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleMode(o.value)}
                aria-pressed={mode === o.value}
                className={`rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-all ${
                  mode === o.value
                    ? 'bg-[#fffdf7] text-[#10301d] shadow-[0_1px_6px_-2px_rgba(16,48,29,0.4)]'
                    : 'text-[#10301d]/55 hover:bg-[#fffdf7]/50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* amount inputs — vary by planning mode */}
        {mode === 'target' && (
          <AmountField
            label="Target amount"
            value={target}
            onChange={setTarget}
            helper={inrWords(target)}
          />
        )}
        {mode === 'sip' && (
          <MonthlyField
            label="Monthly SIP"
            value={monthlySip}
            onChange={setMonthlySip}
            helper={`${inrWords(monthlySip)} a month — we’ll project the corpus it grows into`}
          />
        )}
        {mode === 'swp' && (
          <>
            <AmountField
              label="Retirement corpus"
              value={target}
              onChange={setTarget}
              helper={`${inrWords(target)} saved up — the pot you’ll draw from`}
            />
            <MonthlyField
              label="Monthly withdrawal"
              value={monthlySip}
              onChange={setMonthlySip}
              helper={`${inrWords(monthlySip)} a month to start — we’ll show how long it lasts`}
            />
          </>
        )}

        {/* years */}
        <div className="mt-5 space-y-2">
          <div className="flex items-baseline justify-between">
            <label className="text-[12px] font-semibold tracking-widest text-[#10301d]/55 uppercase">
              {mode === 'swp' ? 'Plan for' : 'Years to goal'}
            </label>
            <span className={`text-lg font-medium text-[#10301d] ${displayFont.className}`}>
              {years} yr
            </span>
          </div>
          <input
            type="range"
            aria-label="Years to goal slider"
            value={years}
            min={1}
            max={50}
            step={1}
            onChange={e => setYears(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#10301d]/12 accent-[#1d4d31] outline-none"
          />
          <div className="flex justify-between text-[11px] text-[#10301d]/35">
            <span>1 yr</span>
            <span>50 yr</span>
          </div>
        </div>

        {/* create button */}
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="mt-7 w-full rounded-xl bg-[#1d4d31] py-3 text-[14px] font-semibold text-[#f4efe2] shadow-[0_4px_20px_-8px_rgba(16,48,29,0.5)] transition-all hover:bg-[#10301d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create Goal →
        </button>
      </div>
    </div>
  )
}
