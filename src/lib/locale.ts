import {
  allSupportedCurrencies,
  currencyForRegion,
  isSupportedCurrency
} from './regionCurrencies'

export type PlannerLocale = {
  region: string
  currency: string
}

export type AmountPreset = { label: string; value: number }

export type GoalDefaults = {
  mode: 'target' | 'sip' | 'swp'
  target: number
  monthlySip: number
  years: number
  annualReturn: number
  stepUp: number
  inflation: number
  lumpSum: number
  inflateTarget: boolean
}

export type SwpDefaults = {
  corpus: number
  withdrawal: number
  annualReturn: number
  stepUp: number
  inflation: number
  years: number
}

export type LocaleCopy = {
  contribution: string
  monthlyContribution: string
  byContribution: string
  planByContribution: string
  contributionHint: string
  contributionModeLabel: string
  returnHelper: string
  swpReturnHelper: string
  stepUpHelper: string
  contributionInYear: (year: number) => string
  allocationHeading: string
  disclaimer: string
  advisorNote: string
  chatSuggestions: string[]
}

export type LocaleProfile = {
  defaults: GoalDefaults
  swp: SwpDefaults
  targetPresets: AmountPreset[]
  monthlyPresets: AmountPreset[]
  maxTarget: number
  maxMonthly: number
  monthlySliderMax: number
  monthlySliderStep: number
  logMin: number
  copy: LocaleCopy
}

export const POPULAR_REGIONS = ['IN', 'US', 'GB'] as const
export const POPULAR_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR'] as const

const STORAGE_KEY = 'financial-planner-locale'
const CRORE = 1e7

const EUROZONE = new Set([
  'AD',
  'AT',
  'AX',
  'BE',
  'BL',
  'CY',
  'DE',
  'EA',
  'EE',
  'ES',
  'EU',
  'EZ',
  'FI',
  'FR',
  'GF',
  'GP',
  'GR',
  'HR',
  'IC',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MC',
  'ME',
  'MF',
  'MQ',
  'MT',
  'NL',
  'PM',
  'PT',
  'RE',
  'SI',
  'SK',
  'SM',
  'TF',
  'VA',
  'XK',
  'YT'
])

export function isPlannerLocale(v: unknown): v is PlannerLocale {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.region === 'string' &&
    o.region.length === 2 &&
    typeof o.currency === 'string' &&
    o.currency.length === 3
  )
}

export function displayLocale(): string {
  if (typeof navigator === 'undefined') return 'en'
  return navigator.language || 'en'
}

/** BCP 47 tag used for number/currency formatting. */
export function localeTag(region: string): string {
  const r = region.toUpperCase()
  if (typeof navigator !== 'undefined') {
    try {
      const nav = new Intl.Locale(navigator.language)
      if (nav.region === r) return navigator.language
    } catch {
      // ignore invalid navigator.language
    }
  }
  return `en-${r}`
}

export function currencySymbol(loc: PlannerLocale): string {
  try {
    const part = new Intl.NumberFormat(localeTag(loc.region), {
      style: 'currency',
      currency: loc.currency,
      currencyDisplay: 'narrowSymbol'
    })
      .formatToParts(0)
      .find(p => p.type === 'currency')
    return part?.value || loc.currency
  } catch {
    return loc.currency
  }
}

export function formatMoney(n: number, loc: PlannerLocale): string {
  const value = Math.round(Number.isFinite(n) ? n : 0)
  try {
    return new Intl.NumberFormat(localeTag(loc.region), {
      style: 'currency',
      currency: loc.currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(value)
  } catch {
    return `${loc.currency} ${value.toLocaleString('en')}`
  }
}

function trimDecimals(v: number): string {
  return v.toFixed(2).replace(/\.?0+$/, '')
}

export function usesIndianCompact(loc: PlannerLocale): boolean {
  return loc.currency === 'INR' || loc.region.toUpperCase() === 'IN'
}

/**
 * Short money label for tiles and chips. Indian numbering (L / Cr) when the
 * currency is INR or the region is India; otherwise K / M / B.
 */
export function formatCompact(
  n: number,
  loc: PlannerLocale,
  opts: { symbol?: boolean } = {}
): string {
  const withSymbol = opts.symbol !== false
  const sym = withSymbol ? currencySymbol(loc) : ''
  const join = (body: string) => (sym ? `${sym}${body}` : body)

  if (!Number.isFinite(n)) return join('0')

  if (usesIndianCompact(loc)) {
    if (Math.abs(n) >= CRORE) return join(`${trimDecimals(n / CRORE)} Cr`)
    if (Math.abs(n) >= 1e5) return join(`${trimDecimals(n / 1e5)} L`)
    if (Math.abs(n) >= 1e3) return join(`${trimDecimals(n / 1e3)} K`)
    return withSymbol ? formatMoney(n, loc) : String(Math.round(n))
  }

  if (Math.abs(n) >= 1e9) return join(`${trimDecimals(n / 1e9)}B`)
  if (Math.abs(n) >= 1e6) return join(`${trimDecimals(n / 1e6)}M`)
  if (Math.abs(n) >= 1e3) return join(`${trimDecimals(n / 1e3)}K`)
  return withSymbol ? formatMoney(n, loc) : String(Math.round(n))
}

function sortWithPinned<T>(
  items: T[],
  pin: readonly string[],
  key: (item: T) => string,
  name: (item: T) => string
): T[] {
  const pinSet = new Set(pin)
  const pinned: T[] = []
  for (const p of pin) {
    const hit = items.find(i => key(i) === p)
    if (hit) pinned.push(hit)
  }
  const rest = items
    .filter(i => !pinSet.has(key(i)))
    .sort((a, b) => name(a).localeCompare(name(b), displayLocale()))
  return [...pinned, ...rest]
}

export type RegionOption = { code: string; name: string }
export type CurrencyOption = { code: string; name: string }

const regionCache = new Map<string, RegionOption[]>()
const currencyCache = new Map<string, CurrencyOption[]>()

/** Every 2-letter region the runtime can name, with India / US / UK first. */
export function listRegions(disp = displayLocale()): RegionOption[] {
  const cached = regionCache.get(disp)
  if (cached) return cached

  const dn = new Intl.DisplayNames([disp, 'en'], { type: 'region' })
  // Withdrawn / reserved ISO codes that Intl still names, usually as a
  // duplicate of a living country (DD → Germany, UK → United Kingdom).
  const withdrawn = new Set([
    'AN',
    'BU',
    'CS',
    'DD',
    'DY',
    'NT',
    'RH',
    'SU',
    'TP',
    'UK',
    'YU',
    'ZR'
  ])
  const out: RegionOption[] = []
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b)
      if (withdrawn.has(code)) continue
      const name = dn.of(code)
      if (name && name !== code) out.push({ code, name })
    }
  }
  const sorted = sortWithPinned(
    out,
    POPULAR_REGIONS,
    r => r.code,
    r => r.name
  )
  regionCache.set(disp, sorted)
  return sorted
}

/** Every ISO currency the runtime supports, with INR / USD / GBP / EUR first. */
export function listCurrencies(disp = displayLocale()): CurrencyOption[] {
  const cached = currencyCache.get(disp)
  if (cached) return cached

  const dn = new Intl.DisplayNames([disp, 'en'], { type: 'currency' })
  const out: CurrencyOption[] = []
  for (const code of allSupportedCurrencies()) {
    if (code === 'XXX' || code === 'XTS') continue
    const name = dn.of(code)
    if (name && name !== code) out.push({ code, name })
  }
  const sorted = sortWithPinned(
    out,
    POPULAR_CURRENCIES,
    c => c.code,
    c => c.name
  )
  currencyCache.set(disp, sorted)
  return sorted
}

export function regionName(code: string, disp = displayLocale()): string {
  try {
    return (
      new Intl.DisplayNames([disp, 'en'], { type: 'region' }).of(code) || code
    )
  } catch {
    return code
  }
}

export function currencyName(code: string, disp = displayLocale()): string {
  try {
    return (
      new Intl.DisplayNames([disp, 'en'], { type: 'currency' }).of(code) || code
    )
  } catch {
    return code
  }
}

function currencyDigits(code: string): number {
  try {
    return (
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: code
      }).resolvedOptions().maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

type CopyKind = 'IN' | 'US' | 'GB' | 'EU' | 'OTHER'
type AmountKind = 'INR' | 'USD' | 'GBP' | 'EUR' | 'ZERO' | 'OTHER'

function copyKind(region: string): CopyKind {
  const r = region.toUpperCase()
  if (r === 'IN') return 'IN'
  if (r === 'US') return 'US'
  if (r === 'GB') return 'GB'
  if (EUROZONE.has(r)) return 'EU'
  return 'OTHER'
}

function amountKind(currency: string): AmountKind {
  const c = currency.toUpperCase()
  if (c === 'INR') return 'INR'
  if (c === 'USD') return 'USD'
  if (c === 'GBP') return 'GBP'
  if (c === 'EUR') return 'EUR'
  if (currencyDigits(c) === 0) return 'ZERO'
  return 'OTHER'
}

function presets(values: number[], loc: PlannerLocale): AmountPreset[] {
  return values.map(value => ({
    label: formatCompact(value, loc, { symbol: false }),
    value
  }))
}

function buildCopy(loc: PlannerLocale, exampleIncome: number): LocaleCopy {
  const kind = copyKind(loc.region)
  const sip = kind === 'IN'
  const contribution = sip ? 'SIP' : 'contribution'
  const monthlyContribution = sip ? 'Monthly SIP' : 'Monthly contribution'
  const income = formatMoney(exampleIncome, loc)

  return {
    contribution,
    monthlyContribution,
    byContribution: sip ? 'by SIP' : 'by contribution',
    planByContribution: sip ? 'By SIP' : 'By amount',
    contributionHint: sip ? 'Grow a monthly SIP' : 'Grow a monthly amount',
    contributionModeLabel: sip ? 'SIP' : 'Invest',
    returnHelper: sip
      ? 'Equity mutual funds have historically averaged ~12% over the long run.'
      : kind === 'US'
        ? 'A diversified stock/bond mix has historically returned around 7–10%. 8% is a common planning rate.'
        : kind === 'GB'
          ? 'A global tracker mix is often planned at 5–8% after fees.'
          : kind === 'EU'
            ? 'A diversified global portfolio is often planned at 5–8% after fees.'
            : 'Use a long-run rate you believe in — 6–8% is a common planning assumption.',
    swpReturnHelper: sip
      ? 'A drawdown corpus is usually held more conservatively — often 7–9% p.a.'
      : 'Drawdown portfolios are usually more conservative than accumulation — often 4–7% p.a.',
    stepUpHelper: sip
      ? 'How much you raise the monthly SIP every year.'
      : 'How much you raise the monthly contribution every year.',
    contributionInYear: year =>
      sip ? `SIP in yr ${year}` : `Contribution in yr ${year}`,
    allocationHeading: sip
      ? 'Monthly SIP allocation'
      : 'Monthly contribution allocation',
    disclaimer: sip
      ? 'Estimates assume monthly compounding with contributions at the start of each month and an annual step-up. Actual mutual-fund returns vary and are not guaranteed.'
      : 'Estimates assume monthly compounding with contributions at the start of each month and an annual step-up. Actual market returns vary and are not guaranteed.',
    advisorNote:
      kind === 'IN'
        ? 'You are not a SEBI-registered advisor; for large or complex decisions, gently suggest consulting a qualified financial advisor.'
        : kind === 'US'
          ? 'You are not a SEC-registered or fiduciary advisor; for large or complex decisions, gently suggest consulting a qualified financial advisor.'
          : kind === 'GB'
            ? 'You are not authorised by the FCA; for large or complex decisions, gently suggest consulting a qualified financial advisor.'
            : 'You are not a licensed financial advisor; rules vary by country. For large or complex decisions, gently suggest consulting a qualified advisor.',
    chatSuggestions: [
      `I earn ${income}/month — help me build a plan.`,
      'Am I investing enough for my goals?',
      'How should I split my savings across these goals?',
      `What if I increase my monthly ${contribution} by 5%?`
    ]
  }
}

function amountProfile(loc: PlannerLocale): Omit<LocaleProfile, 'copy'> {
  const kind = amountKind(loc.currency)
  const chip = (values: number[]) => presets(values, loc)

  if (kind === 'INR') {
    return {
      defaults: {
        mode: 'target',
        target: 1 * CRORE,
        monthlySip: 25_000,
        years: 10,
        annualReturn: 12,
        stepUp: 10,
        inflation: 6,
        lumpSum: 0,
        inflateTarget: false
      },
      swp: {
        corpus: 2 * CRORE,
        withdrawal: 50_000,
        annualReturn: 8,
        stepUp: 6,
        inflation: 6,
        years: 25
      },
      targetPresets: chip([
        50e5,
        1 * CRORE,
        2 * CRORE,
        5 * CRORE,
        10 * CRORE,
        25 * CRORE,
        50 * CRORE
      ]),
      monthlyPresets: chip([5_000, 10_000, 25_000, 50_000, 1_00_000, 2_00_000]),
      maxTarget: 100 * CRORE,
      maxMonthly: 50e5,
      monthlySliderMax: 2e5,
      monthlySliderStep: 500,
      logMin: 1e5
    }
  }

  if (kind === 'GBP') {
    return {
      defaults: {
        mode: 'target',
        target: 500_000,
        monthlySip: 1_000,
        years: 20,
        annualReturn: 7,
        stepUp: 3,
        inflation: 2.5,
        lumpSum: 0,
        inflateTarget: false
      },
      swp: {
        corpus: 1_000_000,
        withdrawal: 3_000,
        annualReturn: 5,
        stepUp: 2.5,
        inflation: 2.5,
        years: 30
      },
      targetPresets: chip([
        50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000
      ]),
      monthlyPresets: chip([250, 500, 1_000, 2_000, 3_000, 5_000]),
      maxTarget: 50_000_000,
      maxMonthly: 50_000,
      monthlySliderMax: 10_000,
      monthlySliderStep: 50,
      logMin: 5_000
    }
  }

  if (kind === 'EUR') {
    return {
      defaults: {
        mode: 'target',
        target: 500_000,
        monthlySip: 1_000,
        years: 20,
        annualReturn: 7,
        stepUp: 2,
        inflation: 2,
        lumpSum: 0,
        inflateTarget: false
      },
      swp: {
        corpus: 1_000_000,
        withdrawal: 3_000,
        annualReturn: 5,
        stepUp: 2,
        inflation: 2,
        years: 30
      },
      targetPresets: chip([
        50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000
      ]),
      monthlyPresets: chip([250, 500, 1_000, 2_000, 3_000, 5_000]),
      maxTarget: 50_000_000,
      maxMonthly: 50_000,
      monthlySliderMax: 10_000,
      monthlySliderStep: 50,
      logMin: 5_000
    }
  }

  if (kind === 'ZERO') {
    return {
      defaults: {
        mode: 'target',
        target: 100_000_000,
        monthlySip: 200_000,
        years: 20,
        annualReturn: 6,
        stepUp: 2,
        inflation: 2,
        lumpSum: 0,
        inflateTarget: false
      },
      swp: {
        corpus: 200_000_000,
        withdrawal: 600_000,
        annualReturn: 4,
        stepUp: 2,
        inflation: 2,
        years: 30
      },
      targetPresets: chip([
        10_000_000, 50_000_000, 100_000_000, 250_000_000, 500_000_000,
        1_000_000_000, 5_000_000_000
      ]),
      monthlyPresets: chip([
        50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000
      ]),
      maxTarget: 10_000_000_000,
      maxMonthly: 50_000_000,
      monthlySliderMax: 2_000_000,
      monthlySliderStep: 10_000,
      logMin: 100_000
    }
  }

  // USD and other 2-decimal currencies share western-style round numbers.
  return {
    defaults: {
      mode: 'target',
      target: 1_000_000,
      monthlySip: 2_000,
      years: 20,
      annualReturn: 8,
      stepUp: 3,
      inflation: 3,
      lumpSum: 0,
      inflateTarget: false
    },
    swp: {
      corpus: 2_000_000,
      withdrawal: 6_000,
      annualReturn: 6,
      stepUp: 3,
      inflation: 3,
      years: 30
    },
    targetPresets: chip([
      100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000
    ]),
    monthlyPresets: chip([250, 500, 1_000, 2_000, 5_000, 10_000]),
    maxTarget: 100_000_000,
    maxMonthly: 100_000,
    monthlySliderMax: 15_000,
    monthlySliderStep: 50,
    logMin: 10_000
  }
}

export function profileFor(loc: PlannerLocale): LocaleProfile {
  const amounts = amountProfile(loc)
  const exampleIncome =
    amountKind(loc.currency) === 'INR'
      ? 50_000
      : amountKind(loc.currency) === 'ZERO'
        ? 500_000
        : amountKind(loc.currency) === 'GBP' ||
            amountKind(loc.currency) === 'EUR'
          ? 3_000
          : 5_000
  return { ...amounts, copy: buildCopy(loc, exampleIncome) }
}

/** Guess region/currency from the browser locale. */
export function suggestLocale(): PlannerLocale | null {
  if (typeof navigator === 'undefined') return null
  try {
    const region = new Intl.Locale(navigator.language).region
    if (!region || region.length !== 2) return null
    const known = listRegions().some(r => r.code === region)
    if (!known) return null
    return { region, currency: currencyForRegion(region) }
  } catch {
    return null
  }
}

export function loadLocale(): PlannerLocale | null {
  if (typeof window === 'undefined') return null
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null'
    )
    if (!isPlannerLocale(parsed)) return null
    const region = parsed.region.toUpperCase()
    const currency = parsed.currency.toUpperCase()
    if (!isSupportedCurrency(currency))
      return { region, currency: currencyForRegion(region) }
    return { region, currency }
  } catch {
    return null
  }
}

export function saveLocale(loc: PlannerLocale): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        region: loc.region.toUpperCase(),
        currency: loc.currency.toUpperCase()
      })
    )
    return true
  } catch (err) {
    console.warn('Could not save locale to localStorage:', err)
    return false
  }
}

export { currencyForRegion }
