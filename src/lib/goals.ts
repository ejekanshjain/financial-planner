export const CRORE = 1e7
export const MAX_TARGET = 100 * CRORE

export interface Goal {
  id: string
  name: string
  icon: string
  /**
   * The amount the user typed for "target wealth". When `inflateTarget` is
   * false this is the nominal future value; when true it is today's
   * purchasing power and the real (nominal) target is grown by inflation.
   */
  target: number
  years: number
  annualReturn: number
  stepUp: number
  inflation: number
  /** One-time amount already invested today; grows with the goal. */
  lumpSum: number
  /** When true, `target` is in today's money and is inflated to the horizon. */
  inflateTarget: boolean
  createdAt: number
}

export interface GoalCalc {
  /** Nominal future value the plan is solving for (after any inflation grossing-up). */
  nominalTarget: number
  /** Future value of the lump sum alone at the horizon. */
  lumpFutureValue: number
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
  { emoji: '🎯', label: 'Other' }
]

export const GOAL_DEFAULTS = {
  target: 1 * CRORE,
  years: 10,
  annualReturn: 12,
  stepUp: 10,
  inflation: 6,
  lumpSum: 0,
  inflateTarget: false
}

export const TARGET_PRESETS = [
  { label: '50L', value: 50 * 1e5 },
  { label: '1 Cr', value: 1 * CRORE },
  { label: '2 Cr', value: 2 * CRORE },
  { label: '5 Cr', value: 5 * CRORE },
  { label: '10 Cr', value: 10 * CRORE },
  { label: '25 Cr', value: 25 * CRORE },
  { label: '50 Cr', value: 50 * CRORE }
]

export const CHART_PALETTE = [
  '#1d4d31',
  '#b5893a',
  '#3a7b5e',
  '#8b6914',
  '#2e5d7b',
  '#6b3a8b',
  '#8b3a3a',
  '#2d7a5a'
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
    ...overrides
  }
}

export function calcGoal(goal: Goal): GoalCalc {
  const { target, years, annualReturn, stepUp, inflation, inflateTarget } = goal
  const lumpSum = Math.max(0, goal.lumpSum ?? 0)
  const monthlyRate = annualReturn / 100 / 12
  const stepFactor = 1 + stepUp / 100
  const months = Math.max(1, Math.round(years * 12))

  // When the target is expressed in today's money, gross it up to the horizon.
  const nominalTarget = inflateTarget
    ? target * (1 + inflation / 100) ** years
    : target

  // The lump sum compounds for the full horizon and covers part of the target;
  // the SIP only has to fund whatever remains.
  const lumpFutureValue = lumpSum * (1 + monthlyRate) ** months
  const remaining = Math.max(0, nominalTarget - lumpFutureValue)

  let factor = 0
  for (let m = 1; m <= months; m++) {
    const yearIdx = Math.floor((m - 1) / 12)
    factor = (factor + stepFactor ** yearIdx) * (1 + monthlyRate)
  }

  const monthlySip = factor > 0 ? remaining / factor : 0

  let bal = lumpSum
  let invested = lumpSum
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
  // When a lump sum alone overshoots the target, the plan ends at `bal`
  // (which exceeds nominalTarget), so base the gain on the actual final value.
  const finalValue = Math.max(nominalTarget, bal)
  const gain = finalValue - invested
  const todayValue = nominalTarget / (1 + inflation / 100) ** years
  const erodedPct =
    nominalTarget > 0 ? (1 - todayValue / nominalTarget) * 100 : 0

  return {
    nominalTarget,
    lumpFutureValue,
    monthlySip,
    invested,
    gain,
    lastYearMonthly,
    todayValue,
    erodedPct,
    series
  }
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
  return (
    1 +
    Math.round(((Math.log10(Math.max(LOG_MIN, value)) - lo) / (hi - lo)) * 999)
  )
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
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(normalizeGoal) : []
  } catch {
    return []
  }
}

/**
 * Persist goals to localStorage. Returns `false` (rather than throwing) when
 * the write fails — e.g. quota exceeded or storage blocked in private mode — so
 * callers never crash on a failed save and can warn the user instead.
 */
export function saveGoals(goals: Goal[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
    return true
  } catch (err) {
    console.warn('Could not save goals to localStorage:', err)
    return false
  }
}

export function clearGoalsStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/* ── import / export ──────────────────────────────────────── */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n))

const num = (v: unknown, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Coerce an untrusted object into a valid Goal, filling/clamping every field. */
function normalizeGoal(raw: unknown): Goal {
  const g = (raw ?? {}) as Record<string, unknown>
  const name =
    typeof g.name === 'string' && g.name.trim() ? g.name : 'Untitled Goal'
  return {
    id: typeof g.id === 'string' && g.id ? g.id : crypto.randomUUID(),
    name,
    icon: typeof g.icon === 'string' && g.icon ? g.icon : '🎯',
    target: clamp(num(g.target, GOAL_DEFAULTS.target), 0, MAX_TARGET),
    years: clamp(Math.round(num(g.years, GOAL_DEFAULTS.years)), 1, 50),
    annualReturn: clamp(num(g.annualReturn, GOAL_DEFAULTS.annualReturn), 1, 30),
    stepUp: clamp(num(g.stepUp, GOAL_DEFAULTS.stepUp), 0, 50),
    inflation: clamp(num(g.inflation, GOAL_DEFAULTS.inflation), 0, 15),
    lumpSum: clamp(num(g.lumpSum, 0), 0, MAX_TARGET),
    inflateTarget: Boolean(g.inflateTarget),
    createdAt: num(g.createdAt, Date.now())
  }
}

const EXPORT_VERSION = 1

/** Trigger a download of all goals as a JSON file. */
export function downloadGoals(goals: Goal[]): void {
  if (typeof window === 'undefined') return
  const payload = {
    app: 'sip-pro',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    goals
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sip-pro-goals-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Parse the contents of an exported file into a list of valid goals.
 * Accepts either a bare array of goals or the wrapped `{ goals: [...] }` shape.
 * Throws a user-friendly Error when the file cannot be understood.
 */
export function parseGoalsFile(raw: string): Goal[] {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('That file isn’t valid JSON.')
  }
  const list = Array.isArray(data) ? data : (data as { goals?: unknown })?.goals
  if (!Array.isArray(list)) {
    throw new Error('No goals found in this file.')
  }
  if (list.length === 0) {
    throw new Error('This file contains no goals.')
  }
  return list.map(normalizeGoal)
}

/* ── share via link ───────────────────────────────────────── */
const SHARE_PARAM = 'plan'

// btoa/atob only handle Latin-1, but goals contain emoji and non-ASCII names,
// so round-trip through UTF-8 bytes. The base64url variant keeps the payload
// safe to drop into a URL without percent-encoding.
function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach(b => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToUtf8(b64: string): string {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Build a shareable link to the current page that embeds the given goals as an
 * encoded query param. Reuses the current `window.location.href` so the link
 * always points back at wherever the app is hosted.
 */
export function buildShareUrl(goals: Goal[]): string {
  const payload = { app: 'sip-pro', version: EXPORT_VERSION, goals }
  const url = new URL(window.location.href)
  url.searchParams.set(SHARE_PARAM, utf8ToBase64Url(JSON.stringify(payload)))
  return url.toString()
}

/**
 * If the current URL carries a shared plan, decode it into goals and strip the
 * param from the address bar (so a refresh or re-share doesn't re-import).
 * Returns null when there's nothing to import or the payload is unreadable.
 */
export function consumeSharedGoals(): Goal[] | null {
  if (typeof window === 'undefined') return null
  const url = new URL(window.location.href)
  const encoded = url.searchParams.get(SHARE_PARAM)
  if (!encoded) return null

  // Remove the param regardless of whether decoding succeeds, so a malformed
  // link doesn't keep trying to import on every load.
  url.searchParams.delete(SHARE_PARAM)
  window.history.replaceState({}, '', url.toString())

  try {
    return parseGoalsFile(base64UrlToUtf8(encoded))
  } catch {
    return null
  }
}
