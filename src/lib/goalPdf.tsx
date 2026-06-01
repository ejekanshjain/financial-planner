import {
  Document,
  Font,
  Page,
  pdf,
  StyleSheet,
  Text,
  View
} from '@react-pdf/renderer'
import {
  calcGoal,
  calcSwp,
  CHART_PALETTE,
  formatYearsMonths,
  Goal,
  inr,
  inrWords
} from './goals'
import { SITE_NAME, SITE_URL } from './site'

/* Bundled, rupee-capable subset fonts (served from /public/fonts). Registered
 * once at module load; @react-pdf fetches them when a PDF is generated. */
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: '/fonts/NotoSans-Regular.ttf' },
    { src: '/fonts/NotoSans-Bold.ttf', fontWeight: 'bold' }
  ]
})
// Long ₹ figures shouldn't be hyphen-broken across lines.
Font.registerHyphenationCallback(word => [word])

const FOREST = '#10301d'
const GOLD = '#b5893a'
const GOLD_DEEP = '#8a6722'
const CREAM = '#fffdf7'
const INK = '#10301d'

const PAD = 38

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSans',
    fontSize: 9,
    color: INK,
    paddingBottom: 56,
    backgroundColor: '#ffffff'
  },
  /* header band */
  header: {
    backgroundColor: FOREST,
    paddingHorizontal: PAD,
    paddingTop: 28,
    paddingBottom: 24,
    color: CREAM
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 2,
    color: '#f4efe2',
    opacity: 0.6,
    textTransform: 'uppercase'
  },
  goalName: { fontSize: 24, fontWeight: 'bold', color: CREAM, marginTop: 6 },
  badgeRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  badge: {
    backgroundColor: 'rgba(244,239,226,0.14)',
    color: '#f4efe2',
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10
  },
  body: { paddingHorizontal: PAD, paddingTop: 20 },
  /* hero result */
  hero: {
    borderWidth: 1,
    borderColor: '#e1e5e0',
    borderRadius: 10,
    backgroundColor: '#f4efe2',
    padding: 16,
    marginBottom: 16
  },
  heroLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: GOLD_DEEP,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  heroValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: FOREST,
    marginTop: 4
  },
  heroSub: { fontSize: 9, color: '#10301d', opacity: 0.65, marginTop: 6 },
  /* stat tiles */
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e7eae6',
    borderRadius: 8,
    padding: 10
  },
  statLabel: {
    fontSize: 7,
    letterSpacing: 1,
    color: '#10301d',
    opacity: 0.5,
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: FOREST,
    marginTop: 3
  },
  /* generic section */
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: FOREST,
    marginBottom: 8
  },
  /* purchasing power */
  power: {
    borderWidth: 1,
    borderColor: '#d7c4a0',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18
  },
  powerValue: { fontSize: 20, fontWeight: 'bold', color: FOREST, marginTop: 3 },
  powerNote: { fontSize: 8.5, color: '#10301d', opacity: 0.6, marginTop: 5 },
  /* assumptions */
  assumeWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 },
  assumeItem: { width: '50%', paddingVertical: 4, paddingRight: 10 },
  assumeKey: { fontSize: 7.5, color: '#10301d', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  assumeVal: { fontSize: 10, color: FOREST, fontWeight: 'bold', marginTop: 1 },
  /* table */
  th: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#c5cbc4',
    paddingBottom: 4,
    marginBottom: 2
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#eef0ed'
  },
  cHead: { fontSize: 7.5, color: '#10301d', opacity: 0.55, textTransform: 'uppercase', letterSpacing: 0.5 },
  cYear: { width: '12%', fontSize: 9 },
  cNum: { width: '24%', fontSize: 9, textAlign: 'right', paddingRight: 8 },
  cBar: { width: '16%', justifyContent: 'center' },
  barTrack: { height: 5, backgroundColor: '#eceeeb', borderRadius: 3 },
  barFill: { height: 5, backgroundColor: GOLD, borderRadius: 3 },
  /* portfolio: allocation bar + legend (summary page) */
  allocBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10
  },
  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: 2
  },
  legendDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  legendText: { fontSize: 8.5, color: '#10301d' },
  /* portfolio: goals-at-a-glance table columns */
  gName: { width: '34%', fontSize: 9 },
  gMode: { width: '16%', fontSize: 9 },
  gYrs: { width: '14%', fontSize: 9 },
  gNum: { width: '18%', fontSize: 9, textAlign: 'right', paddingRight: 6 },
  /* footer */
  footer: {
    position: 'absolute',
    bottom: 24,
    left: PAD,
    right: PAD,
    borderTopWidth: 1,
    borderTopColor: '#e7e9e5',
    paddingTop: 8
  },
  footerText: { fontSize: 7.5, color: '#10301d', opacity: 0.5, lineHeight: 1.4 }
})

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statTile}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  )
}

function Assume({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.assumeItem}>
      <Text style={s.assumeKey}>{k}</Text>
      <Text style={s.assumeVal}>{v}</Text>
    </View>
  )
}

function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>
        Projections assume monthly compounding with contributions at the start of
        each month and an annual step-up. Actual mutual-fund returns vary and are
        not guaranteed. Not investment advice.
      </Text>
      <Text style={s.footerText}>
        Generated {generatedAt} · {SITE_URL.replace(/^https?:\/\//, '')}
      </Text>
    </View>
  )
}

/** One full A4 page detailing a single SWP (withdrawal) goal. */
function SwpPlanPage({
  goal,
  generatedAt
}: {
  goal: Goal
  generatedAt: string
}) {
  const w = calcSwp(goal)
  const swpMax = Math.max(w.corpus, ...w.series.map(p => p.balance), 1)
  const endYear = w.series.at(-1)?.year ?? goal.years
  const keepsPace = goal.stepUp >= goal.inflation

  return (
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <Text style={s.eyebrow}>{SITE_NAME}  ·  Withdrawal (SWP) Plan</Text>
        <Text style={s.goalName}>{goal.name || 'Untitled Goal'}</Text>
        <View style={s.badgeRow}>
          <Text style={s.badge}>Planned by withdrawal</Text>
          <Text style={s.badge}>{goal.years}-year plan</Text>
          <Text style={s.badge}>{goal.annualReturn}% p.a. on corpus</Text>
        </View>
      </View>

      <View style={s.body}>
        {/* longevity hero */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>
            {w.sustainable
              ? 'Your corpus is built to last'
              : w.depletesBeforeHorizon
                ? 'Heads up — your corpus runs out early'
                : 'Your corpus lasts'}
          </Text>
          <Text style={s.heroValue}>
            {w.sustainable ? '100+ yrs' : formatYearsMonths(w.lastsMonths)}
          </Text>
          <Text style={s.heroSub}>
            Drawing {inrWords(w.monthlyWithdrawal)} a month, rising +{goal.stepUp}
            % a year, from a {inrWords(w.corpus)} corpus growing at{' '}
            {goal.annualReturn}%.
            {w.sustainable
              ? ' Withdrawals stay within its growth.'
              : w.depletesBeforeHorizon
                ? ` It empties before the ${goal.years}-year plan ends.`
                : ''}
          </Text>
        </View>

        {/* stats */}
        <View style={s.statRow}>
          <Stat label="Total withdrawn" value={inrWords(w.totalWithdrawn)} />
          <Stat
            label={w.depletesBeforeHorizon ? 'Runs out in' : `Left after ${goal.years} yr`}
            value={
              w.depletesBeforeHorizon
                ? formatYearsMonths(w.lastsMonths)
                : inrWords(w.balanceAtHorizon)
            }
          />
          <Stat label="Monthly withdrawal" value={inrWords(w.monthlyWithdrawal)} />
          <Stat
            label={`Income in yr ${goal.years}`}
            value={inrWords(w.lastYearWithdrawal)}
          />
        </View>

        {/* income in today's money */}
        <View style={s.power}>
          <Text style={s.heroLabel}>
            Income in today&rsquo;s money  ·  @ {goal.inflation}% inflation
          </Text>
          <Text style={s.powerValue}>{inr(w.realLastWithdrawal)} /mo</Text>
          <Text style={s.powerNote}>
            Your {inrWords(w.monthlyWithdrawal)}/mo today rises to{' '}
            {inrWords(w.lastYearWithdrawal)}/mo by year {goal.years} — worth{' '}
            {inrWords(w.realLastWithdrawal)}/mo in today&rsquo;s money.{' '}
            {keepsPace
              ? 'Your step-up keeps pace with inflation.'
              : 'Inflation outpaces your step-up, so real income slips over time.'}
          </Text>
        </View>

        {/* assumptions */}
        <Text style={s.sectionTitle}>Plan assumptions</Text>
        <View style={s.assumeWrap}>
          <Assume k="Starting corpus" v={inr(w.corpus)} />
          <Assume k="Monthly withdrawal" v={inr(w.monthlyWithdrawal)} />
          <Assume k="Return on corpus" v={`${goal.annualReturn}% p.a.`} />
          <Assume k="Withdrawal step-up" v={`${goal.stepUp}% / yr`} />
          <Assume k="Assumed inflation" v={`${goal.inflation}% p.a.`} />
          <Assume k="Planning horizon" v={`${goal.years} years`} />
          <Assume
            k={`Lasts ${goal.years} yrs at`}
            v={`${inr(w.sustainableWithdrawal)}/mo`}
          />
        </View>

        {/* corpus drawdown */}
        <Text style={s.sectionTitle}>Corpus drawdown</Text>
        <View style={s.th}>
          <Text style={[s.cYear, s.cHead]}>Year</Text>
          <Text style={[s.cNum, s.cHead]}>Withdrawn</Text>
          <Text style={[s.cNum, s.cHead]}>Balance</Text>
          <View style={s.cBar} />
        </View>
        {w.series.map(row => {
          const pct = swpMax > 0 ? (row.balance / swpMax) * 100 : 0
          return (
            <View style={s.tr} key={row.year} wrap={false}>
              <Text style={s.cYear}>{row.year}</Text>
              <Text style={s.cNum}>{inrWords(row.withdrawn)}</Text>
              <Text style={s.cNum}>{inrWords(row.balance)}</Text>
              <View style={s.cBar}>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
            </View>
          )
        })}
        <Text style={[s.footerText, { marginTop: 8 }]}>
          Chart shows the corpus balance at the end of each year (drawdown ends at
          year {endYear}).
        </Text>
      </View>

      <Footer generatedAt={generatedAt} />
    </Page>
  )
}

/** One full A4 page detailing a single goal's plan — shared by both documents. */
function GoalPlanPage({
  goal,
  generatedAt
}: {
  goal: Goal
  generatedAt: string
}) {
  if (goal.mode === 'swp')
    return <SwpPlanPage goal={goal} generatedAt={generatedAt} />

  const c = calcGoal(goal)
  const isSip = goal.mode === 'sip'
  const maxValue = c.series.at(-1)?.value ?? 1
  const stepLine = `+${goal.stepUp}% a year for ${goal.years} years`
  const lumpLine =
    goal.lumpSum > 0 ? `, plus a ${inrWords(goal.lumpSum)} lump sum` : ''

  return (
    <Page size="A4" style={s.page}>
      {/* header */}
      <View style={s.header}>
          <Text style={s.eyebrow}>{SITE_NAME}  ·  SIP Goal Plan</Text>
          <Text style={s.goalName}>{goal.name || 'Untitled Goal'}</Text>
          <View style={s.badgeRow}>
            <Text style={s.badge}>
              {isSip ? 'Planned by SIP' : 'Planned by target'}
            </Text>
            <Text style={s.badge}>{goal.years}-year horizon</Text>
            <Text style={s.badge}>{goal.annualReturn}% p.a. assumed</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* hero result */}
          <View style={s.hero}>
            {isSip ? (
              <>
                <Text style={s.heroLabel}>
                  Projected corpus in {goal.years} years
                </Text>
                <Text style={s.heroValue}>{inr(c.nominalTarget)}</Text>
                <Text style={s.heroSub}>
                  Investing {inrWords(goal.monthlySip)} a month, stepped up{' '}
                  {stepLine}
                  {lumpLine}.
                </Text>
              </>
            ) : (
              <>
                <Text style={s.heroLabel}>
                  {c.monthlySip > 0
                    ? 'Required monthly SIP'
                    : 'Lump sum already covers this'}
                </Text>
                <Text style={s.heroValue}>{inr(c.monthlySip)}</Text>
                <Text style={s.heroSub}>
                  {c.monthlySip > 0
                    ? `${inrWords(c.monthlySip)} per month, then ${stepLine}${lumpLine}.`
                    : `Your ${inrWords(goal.lumpSum)} lump sum grows to ${inrWords(c.lumpFutureValue)} on its own.`}
                </Text>
              </>
            )}
          </View>

          {/* stats */}
          <View style={s.statRow}>
            <Stat label="Total invested" value={inrWords(c.invested)} />
            <Stat label="Wealth gained" value={inrWords(c.gain)} />
            <Stat
              label={isSip ? 'Monthly SIP' : 'Target wealth'}
              value={isSip ? inrWords(goal.monthlySip) : inrWords(c.nominalTarget)}
            />
            <Stat
              label={`SIP in yr ${goal.years}`}
              value={inrWords(c.lastYearMonthly)}
            />
          </View>

          {/* purchasing power */}
          <View style={s.power}>
            <Text style={s.heroLabel}>
              Today&rsquo;s purchasing power  ·  @ {goal.inflation}% inflation
            </Text>
            <Text style={s.powerValue}>{inr(c.todayValue)}</Text>
            <Text style={s.powerNote}>
              {inrWords(c.nominalTarget)} in {goal.years} years buys what{' '}
              {inrWords(c.todayValue)} buys today — inflation erodes about{' '}
              {c.erodedPct.toFixed(0)}% of its value.
            </Text>
          </View>

          {/* assumptions */}
          <Text style={s.sectionTitle}>Plan assumptions</Text>
          <View style={s.assumeWrap}>
            <Assume k="Time horizon" v={`${goal.years} years`} />
            <Assume k="Expected return" v={`${goal.annualReturn}% p.a.`} />
            <Assume k="Annual step-up" v={`${goal.stepUp}% / yr`} />
            <Assume k="Assumed inflation" v={`${goal.inflation}% p.a.`} />
            {isSip ? (
              <Assume k="Starting monthly SIP" v={inr(goal.monthlySip)} />
            ) : (
              <Assume
                k="Target wealth"
                v={`${inrWords(c.nominalTarget)}${goal.inflateTarget ? ' (today’s money, inflated)' : ''}`}
              />
            )}
            <Assume
              k="Lump sum today"
              v={
                goal.lumpSum > 0
                  ? `${inr(goal.lumpSum)} (grows to ${inrWords(c.lumpFutureValue)})`
                  : 'None'
              }
            />
          </View>

          {/* year-by-year */}
          <Text style={s.sectionTitle}>Year-by-year growth</Text>
          <View style={s.th}>
            <Text style={[s.cYear, s.cHead]}>Year</Text>
            <Text style={[s.cNum, s.cHead]}>Invested</Text>
            <Text style={[s.cNum, s.cHead]}>Value</Text>
            <Text style={[s.cNum, s.cHead]}>Returns</Text>
            <View style={s.cBar} />
          </View>
          {c.series.map(row => {
            const pct = maxValue > 0 ? (row.value / maxValue) * 100 : 0
            return (
              <View style={s.tr} key={row.year} wrap={false}>
                <Text style={s.cYear}>{row.year}</Text>
                <Text style={s.cNum}>{inrWords(row.invested)}</Text>
                <Text style={s.cNum}>{inrWords(row.value)}</Text>
                <Text style={s.cNum}>
                  {inrWords(Math.max(0, row.value - row.invested))}
                </Text>
                <View style={s.cBar}>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* footer repeated on every page */}
        <Footer generatedAt={generatedAt} />
      </Page>
  )
}

export function GoalPdfDocument({
  goal,
  generatedAt
}: {
  goal: Goal
  generatedAt: string
}) {
  return (
    <Document
      title={`${goal.name} — financial plan`}
      author={SITE_NAME}
      creator={SITE_NAME}
    >
      <GoalPlanPage goal={goal} generatedAt={generatedAt} />
    </Document>
  )
}

/** Portfolio cover page: combined totals, SIP allocation, and a goals table. */
function GoalsSummaryPage({
  goals,
  generatedAt
}: {
  goals: Goal[]
  generatedAt: string
}) {
  const rows = goals.map((goal, i) => {
    const isSwp = goal.mode === 'swp'
    const calc = isSwp ? null : calcGoal(goal)
    const swp = isSwp ? calcSwp(goal) : null
    return {
      goal,
      isSwp,
      calc,
      swp,
      color: CHART_PALETTE[i % CHART_PALETTE.length] ?? '#1d4d31',
      monthly: isSwp ? swp!.monthlyWithdrawal : calc!.monthlySip,
      wealth: isSwp ? swp!.corpus : calc!.nominalTarget
    }
  })
  const accum = rows.filter(r => !r.isSwp)
  const totalSip = accum.reduce((sum, r) => sum + r.calc!.monthlySip, 0)
  const totalWealth = accum.reduce((sum, r) => sum + r.calc!.nominalTarget, 0)
  const totalInvested = accum.reduce((sum, r) => sum + r.calc!.invested, 0)
  const totalGain = accum.reduce((sum, r) => sum + r.calc!.gain, 0)
  const totalToday = accum.reduce((sum, r) => sum + r.calc!.todayValue, 0)
  const totalIncome = rows
    .filter(r => r.isSwp)
    .reduce((sum, r) => sum + r.swp!.monthlyWithdrawal, 0)
  const hasAccum = accum.length > 0
  const hasSwp = rows.some(r => r.isSwp)
  const maxYears = goals.reduce((m, g) => Math.max(m, g.years), 0)

  return (
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <Text style={s.eyebrow}>{SITE_NAME}  ·  Portfolio Plan</Text>
        <Text style={s.goalName}>My Financial Plan</Text>
        <View style={s.badgeRow}>
          <Text style={s.badge}>
            {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
          </Text>
          {hasAccum && (
            <Text style={s.badge}>{inrWords(totalSip)}/mo SIP</Text>
          )}
          {hasSwp && (
            <Text style={s.badge}>{inrWords(totalIncome)}/mo income</Text>
          )}
          <Text style={s.badge}>up to {maxYears}-year horizon</Text>
        </View>
      </View>

      <View style={s.body}>
        {/* combined totals */}
        <View style={s.statRow}>
          <Stat label="Total monthly SIP" value={inrWords(totalSip)} />
          <Stat label="Total future wealth" value={inrWords(totalWealth)} />
          <Stat label="Total invested" value={inrWords(totalInvested)} />
          <Stat
            label={hasSwp ? 'Monthly income' : 'Wealth gained'}
            value={inrWords(hasSwp ? totalIncome : totalGain)}
          />
        </View>

        {/* combined purchasing power */}
        <View style={s.power}>
          <Text style={s.heroLabel}>Combined value in today&rsquo;s money</Text>
          <Text style={s.powerValue}>{inr(totalToday)}</Text>
          <Text style={s.powerNote}>
            Your accumulation goals total {inrWords(totalWealth)} at their
            horizons — worth about {inrWords(totalToday)} in today&rsquo;s
            purchasing power once inflation is accounted for.
            {hasSwp
              ? ` Plus ${inrWords(totalIncome)}/mo of withdrawal income from ${
                  rows.filter(r => r.isSwp).length
                } SWP ${rows.filter(r => r.isSwp).length === 1 ? 'plan' : 'plans'}.`
              : ''}
          </Text>
        </View>

        {/* SIP allocation (accumulation goals only) */}
        {totalSip > 0 && (
          <>
            <Text style={s.sectionTitle}>Monthly SIP allocation</Text>
            <View style={s.allocBar}>
              {accum.map(r =>
                r.monthly > 0 ? (
                  <View
                    key={r.goal.id}
                    style={{
                      width: `${(r.monthly / totalSip) * 100}%`,
                      backgroundColor: r.color
                    }}
                  />
                ) : null
              )}
            </View>
            <View style={s.legendWrap}>
              {accum.map(r => (
                <View key={r.goal.id} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: r.color }]} />
                  <Text style={s.legendText}>
                    {r.goal.name || 'Untitled'} — {inrWords(r.monthly)}/mo
                    {` (${((r.monthly / totalSip) * 100).toFixed(0)}%)`}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* goals at a glance */}
        <Text style={[s.sectionTitle, { marginTop: 16 }]}>Goals at a glance</Text>
        <View style={s.th}>
          <Text style={[s.gName, s.cHead]}>Goal</Text>
          <Text style={[s.gMode, s.cHead]}>Plan</Text>
          <Text style={[s.gYrs, s.cHead]}>Horizon</Text>
          <Text style={[s.gNum, s.cHead]}>Monthly</Text>
          <Text style={[s.gNum, s.cHead]}>{hasSwp ? 'Wealth / corpus' : 'Future wealth'}</Text>
        </View>
        {rows.map(r => (
          <View key={r.goal.id} style={s.tr} wrap={false}>
            <View
              style={[s.gName, { flexDirection: 'row', alignItems: 'center' }]}
            >
              <View style={[s.legendDot, { backgroundColor: r.color }]} />
              <Text>{r.goal.name || 'Untitled'}</Text>
            </View>
            <Text style={s.gMode}>
              {r.isSwp ? 'Withdrawal' : r.goal.mode === 'sip' ? 'By SIP' : 'By target'}
            </Text>
            <Text style={s.gYrs}>{r.goal.years} yr</Text>
            <Text style={s.gNum}>{inrWords(r.monthly)}</Text>
            <Text style={s.gNum}>{inrWords(r.wealth)}</Text>
          </View>
        ))}

        <Text style={[s.footerText, { marginTop: 12 }]}>
          A detailed one-page plan for each goal follows.
        </Text>
      </View>

      <Footer generatedAt={generatedAt} />
    </Page>
  )
}

export function GoalsPdfDocument({
  goals,
  generatedAt
}: {
  goals: Goal[]
  generatedAt: string
}) {
  return (
    <Document
      title="My financial plan"
      author={SITE_NAME}
      creator={SITE_NAME}
    >
      <GoalsSummaryPage goals={goals} generatedAt={generatedAt} />
      {goals.map(goal => (
        <GoalPlanPage key={goal.id} goal={goal} generatedAt={generatedAt} />
      ))}
    </Document>
  )
}

const todayStamp = () =>
  new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Generate the plan PDF for a goal and trigger a browser download. */
export async function downloadGoalPdf(goal: Goal): Promise<void> {
  const blob = await pdf(
    <GoalPdfDocument goal={goal} generatedAt={todayStamp()} />
  ).toBlob()

  const safeName =
    (goal.name || 'goal')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'goal'
  triggerDownload(blob, `sip-plan-${safeName}.pdf`)
}

/** Generate a combined PDF — a portfolio summary plus a page per goal. */
export async function downloadGoalsPdf(goals: Goal[]): Promise<void> {
  const blob = await pdf(
    <GoalsPdfDocument goals={goals} generatedAt={todayStamp()} />
  ).toBlob()
  triggerDownload(blob, 'sip-financial-plan.pdf')
}
