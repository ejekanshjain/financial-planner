export const CRORE = 1e7
export const MAX_TARGET = 100 * CRORE

export interface Goal {
  id: string
  name: string
  icon: string
  target: number
  years: number
  annualReturn: number
  stepUp: number
  inflation: number
  createdAt: number
}

export interface GoalCalc {
  monthlySip: number
  invested: number
  gain: number
  lastYearMonthly: number
  todayValue: number
  erodedPct: number
  series: { year: number; invested: number; value: number }[]
}

export const GOAL_ICONS = [
  { emoji: '🏠', label: 'House' },
  { emoji: '🚗', label: 'Car' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '📚', label: 'Education' },
  { emoji: '💒', label: 'Wedding' },
  { emoji: '🏖️', label: 'Retirement' },
  { emoji: '🎓', label: 'Degree' },
  { emoji: '🏢', label: 'Business' },
  { emoji: '💊', label: 'Healthcare' },
  { emoji: '🎯', label: 'Other' },
]

export const GOAL_DEFAULTS = {
  target: 1 * CRORE,
  years: 10,
  annualReturn: 12,
  stepUp: 10,
  inflation: 6,
}

export const TARGET_PRESETS = [
  { label: '50L', value: 50 * 1e5 },
  { label: '1 Cr', value: 1 * CRORE },
  { label: '2 Cr', value: 2 * CRORE },
  { label: '5 Cr', value: 5 * CRORE },
  { label: '10 Cr', value: 10 * CRORE },
  { label: '25 Cr', value: 25 * CRORE },
  { label: '50 Cr', value: 50 * CRORE },
]

export const CHART_PALETTE = [
  '#1d4d31',
  '#b5893a',
  '#3a7b5e',
  '#8b6914',
  '#2e5d7b',
  '#6b3a8b',
  '#8b3a3a',
  '#2d7a5a',
]

export function makeGoal(
  name: string,
  icon: string,
  overrides: Partial<typeof GOAL_DEFAULTS> = {}
): Goal {
  return {
    id: crypto.randomUUID(),
    name,
    icon,
    createdAt: Date.now(),
    ...GOAL_DEFAULTS,
    ...overrides,
  }
}

export function calcGoal(goal: Goal): GoalCalc {
  const { target, years, annualReturn, stepUp, inflation } = goal
  const monthlyRate = annualReturn / 100 / 12
  const stepFactor = 1 + stepUp / 100
  const months = Math.max(1, Math.round(years * 12))

  let factor = 0
  for (let m = 1; m <= months; m++) {
    const yearIdx = Math.floor((m - 1) / 12)
    factor = (factor + stepFactor ** yearIdx) * (1 + monthlyRate)
  }

  const monthlySip = factor > 0 ? target / factor : 0

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
  const todayValue = target / (1 + inflation / 100) ** years
  const erodedPct = target > 0 ? (1 - todayValue / target) * 100 : 0

  return { monthlySip, invested, gain, lastYearMonthly, todayValue, erodedPct, series }
}

/* ── log-scale slider (0-1000 ↔ 0 to MAX_TARGET) ─────────── */
const LOG_MIN = 1e5
const LOG_MAX = MAX_TARGET

export function logSliderToValue(pos: number): number {
  if (pos <= 0) return 0
  const lo = Math.log10(LOG_MIN)
  const hi = Math.log10(LOG_MAX)
  const raw = Math.pow(10, lo + ((hi - lo) * (pos - 1)) / 999)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1)
  return Math.round(raw / mag) * mag
}

export function valueToLogSlider(value: number): number {
  if (value <= 0) return 0
  const lo = Math.log10(LOG_MIN)
  const hi = Math.log10(LOG_MAX)
  return 1 + Math.round(((Math.log10(Math.max(LOG_MIN, value)) - lo) / (hi - lo)) * 999)
}

/* ── formatters ───────────────────────────────────────────── */
export function inr(n: number) {
  return (
    '₹' +
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
      Math.round(Number.isFinite(n) ? n : 0)
    )
  )
}

export function inrWords(n: number) {
  if (!Number.isFinite(n)) return '₹0'
  const trim = (v: number) => v.toFixed(2).replace(/\.00$/, '')
  if (n >= CRORE) return `₹${trim(n / CRORE)} Cr`
  if (n >= 1e5) return `₹${trim(n / 1e5)} L`
  if (n >= 1e3) return `₹${trim(n / 1e3)} K`
  return inr(n)
}

/* ── localStorage ─────────────────────────────────────────── */
const STORAGE_KEY = 'sip-pro-goals'

export function loadGoals(): Goal[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveGoals(goals: Goal[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

export function clearGoalsStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
