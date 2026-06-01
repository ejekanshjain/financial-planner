import type { UIMessage } from 'ai'
import { calcGoal, calcSwp, formatYearsMonths, Goal, inr, inrWords } from './goals'

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
export function buildFinancialContext(goals: Goal[]): string {
  if (goals.length === 0) {
    return 'The user has not created any financial goals yet.'
  }

  const lines: string[] = []
  let totalSip = 0
  let totalTarget = 0
  let totalIncome = 0

  goals.forEach((goal, i) => {
    if (goal.mode === 'swp') {
      // Decumulation goal — summarise via the withdrawal model instead.
      const w = calcSwp(goal)
      totalIncome += w.monthlyWithdrawal
      lines.push(
        [
          `${i + 1}. ${goal.icon} ${goal.name}`,
          `   - Planning mode: SWP / withdrawal (user draws a monthly income from a corpus)`,
          `   - Starting corpus: ${inrWords(w.corpus)} (${inr(w.corpus)})`,
          `   - Monthly withdrawal (now): ${inr(w.monthlyWithdrawal)}, rising ${goal.stepUp}%/yr`,
          `   - Return on the corpus while drawing down: ${goal.annualReturn}%`,
          `   - How long it lasts: ${
            w.sustainable
              ? 'over 100 years — effectively sustainable at this rate'
              : formatYearsMonths(w.lastsMonths)
          }`,
          `   - Planning horizon: ${goal.years} years; balance left at the horizon: ${inrWords(w.balanceAtHorizon)}`,
          `   - Final-year withdrawal: ${inr(w.lastYearWithdrawal)}/mo (${inrWords(w.realLastWithdrawal)}/mo in today’s money at ${goal.inflation}% inflation)`,
          `   - Total withdrawn over the horizon: ${inrWords(w.totalWithdrawn)}`,
          `   - A ${inrWords(w.sustainableWithdrawal)}/mo withdrawal would last exactly ${goal.years} years`
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
            ? 'SIP-driven (user fixes the monthly SIP; the corpus is projected)'
            : 'target-driven (user fixes the target; the SIP is solved for)'
        }`,
        `   - Time horizon: ${goal.years} years`,
        `   - ${sipMode ? 'Projected corpus' : 'Target wealth'}: ${inrWords(c.nominalTarget)} (${inr(c.nominalTarget)})${
          !sipMode && goal.inflateTarget
            ? ' — entered in today’s money, inflated to the horizon'
            : ''
        }`,
        `   - ${sipMode ? 'Chosen' : 'Required'} monthly SIP (now): ${inr(c.monthlySip)}`,
        `   - Final-year monthly SIP: ${inr(c.lastYearMonthly)}`,
        `   - Expected annual return: ${goal.annualReturn}%`,
        `   - Annual SIP step-up: ${goal.stepUp}%`,
        `   - Assumed inflation: ${goal.inflation}%`,
        goal.lumpSum > 0
          ? `   - One-time lump sum invested today: ${inr(goal.lumpSum)} (grows to ${inrWords(c.lumpFutureValue)})`
          : '   - No upfront lump sum',
        `   - Total invested over the plan: ${inrWords(c.invested)}; projected gain: ${inrWords(c.gain)}`
      ].join('\n')
    )
  })

  const totals = [
    totalSip > 0
      ? `Combined required monthly SIP across accumulation goals: ${inr(totalSip)}.`
      : null,
    totalTarget > 0
      ? `Combined target/projected wealth: ${inrWords(totalTarget)}.`
      : null,
    totalIncome > 0
      ? `Combined monthly income from withdrawal (SWP) goals: ${inr(totalIncome)}.`
      : null
  ].filter(Boolean)

  return [
    `The user currently has ${goals.length} financial goal(s):`,
    '',
    lines.join('\n\n'),
    '',
    ...totals
  ].join('\n')
}
