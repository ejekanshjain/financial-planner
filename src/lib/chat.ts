import type { UIMessage } from 'ai'
import { calcGoal, calcSwp, formatYearsMonths, Goal } from './goals'
import { formatCompact, formatMoney, PlannerLocale, profileFor } from './locale'

/* ── localStorage persistence ─────────────────────────────── */
const CHAT_STORAGE_KEY = 'financial-planner-chat'

export function loadChat(): UIMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    // Only keep entries that look like UI messages with renderable parts.
    return Array.isArray(parsed)
      ? parsed.filter(
          (m): m is UIMessage =>
            m && typeof m === 'object' && Array.isArray(m.parts) && m.role
        )
      : []
  } catch {
    return []
  }
}

/**
 * Persist the chat transcript. Returns `false` (rather than throwing) when the
 * write fails — e.g. quota exceeded or private mode — so the UI never crashes.
 */
export function saveChat(messages: UIMessage[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    return true
  } catch (err) {
    console.warn('Could not save chat to localStorage:', err)
    return false
  }
}

export function clearChatStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CHAT_STORAGE_KEY)
}

/* ── financial context for the model ──────────────────────── */
/**
 * Summarise the user's goals into a plain-text snapshot the model can reason
 * over. We send the derived numbers (monthly SIP, totals, inflation impact)
 * rather than the raw inputs so the assistant can reference concrete figures
 * without having to redo the maths.
 */
export function buildFinancialContext(
  goals: Goal[],
  loc: PlannerLocale
): string {
  const money = (n: number) => formatMoney(n, loc)
  const compact = (n: number) => formatCompact(n, loc)
  const copy = profileFor(loc).copy
  const contribution = copy.contribution

  const header = [
    `The user plans from region ${loc.region} in ${loc.currency}.`,
    `Format amounts with ${loc.currency} and ${
      loc.currency === 'INR' || loc.region === 'IN'
        ? 'Indian lakhs/crores'
        : 'thousands/millions/billions'
    }.`,
    `Call a recurring monthly investment a "${contribution}".`,
    copy.advisorNote
  ].join('\n')

  if (goals.length === 0) {
    return `${header}\n\nThe user has not created any financial goals yet.`
  }

  const lines: string[] = []
  let totalSip = 0
  let totalTarget = 0
  let totalIncome = 0

  goals.forEach((goal, i) => {
    if (goal.mode === 'swp') {
      const w = calcSwp(goal)
      totalIncome += w.monthlyWithdrawal
      lines.push(
        [
          `${i + 1}. ${goal.icon} ${goal.name}`,
          `   - Planning mode: withdrawal (user draws a monthly income from a corpus)`,
          `   - Starting corpus: ${compact(w.corpus)} (${money(w.corpus)})`,
          `   - Monthly withdrawal (now): ${money(w.monthlyWithdrawal)}, rising ${goal.stepUp}%/yr`,
          `   - Return on the corpus while drawing down: ${goal.annualReturn}%`,
          `   - How long it lasts: ${
            w.sustainable
              ? 'over 100 years — effectively sustainable at this rate'
              : formatYearsMonths(w.lastsMonths)
          }`,
          `   - Planning horizon: ${goal.years} years; balance left at the horizon: ${compact(w.balanceAtHorizon)}`,
          `   - Final-year withdrawal: ${money(w.lastYearWithdrawal)}/mo (${compact(w.realLastWithdrawal)}/mo in today’s money at ${goal.inflation}% inflation)`,
          `   - Total withdrawn over the horizon: ${compact(w.totalWithdrawn)}`,
          `   - A ${compact(w.sustainableWithdrawal)}/mo withdrawal would last exactly ${goal.years} years`
        ].join('\n')
      )
      return
    }

    const c = calcGoal(goal)
    const sipMode = goal.mode === 'sip'
    totalSip += c.monthlySip
    totalTarget += c.nominalTarget
    lines.push(
      [
        `${i + 1}. ${goal.icon} ${goal.name}`,
        `   - Planning mode: ${
          sipMode
            ? `${contribution}-driven (user fixes the monthly ${contribution}; the corpus is projected)`
            : `target-driven (user fixes the target; the ${contribution} is solved for)`
        }`,
        `   - Time horizon: ${goal.years} years`,
        `   - ${sipMode ? 'Projected corpus' : 'Target wealth'}: ${compact(c.nominalTarget)} (${money(c.nominalTarget)})${
          !sipMode && goal.inflateTarget
            ? ' — entered in today’s money, inflated to the horizon'
            : ''
        }`,
        `   - ${sipMode ? 'Chosen' : 'Required'} monthly ${contribution} (now): ${money(c.monthlySip)}`,
        `   - Final-year monthly ${contribution}: ${money(c.lastYearMonthly)}`,
        `   - Expected annual return: ${goal.annualReturn}%`,
        `   - Annual ${contribution} step-up: ${goal.stepUp}%`,
        `   - Assumed inflation: ${goal.inflation}%`,
        goal.lumpSum > 0
          ? `   - One-time lump sum invested today: ${money(goal.lumpSum)} (grows to ${compact(c.lumpFutureValue)})`
          : '   - No upfront lump sum',
        `   - Total invested over the plan: ${compact(c.invested)}; projected gain: ${compact(c.gain)}`
      ].join('\n')
    )
  })

  const totals = [
    totalSip > 0
      ? `Combined required monthly ${contribution} across accumulation goals: ${money(totalSip)}.`
      : null,
    totalTarget > 0
      ? `Combined target/projected wealth: ${compact(totalTarget)}.`
      : null,
    totalIncome > 0
      ? `Combined monthly income from withdrawal goals: ${money(totalIncome)}.`
      : null
  ].filter(Boolean)

  return [
    header,
    '',
    `The user currently has ${goals.length} financial goal(s):`,
    '',
    lines.join('\n\n'),
    '',
    ...totals
  ].join('\n')
}
