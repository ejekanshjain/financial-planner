'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { displayFont } from '~/lib/fonts'
import {
  CHART_PALETTE,
  Goal,
  GoalCalc,
  buildShareUrl,
  calcGoal,
  downloadGoals,
  inrWords,
  parseGoalsFile,
} from '~/lib/goals'
import { GoalCard } from './GoalCard'
import { NewGoalModal } from './NewGoalModal'

const CREAM = '#f4efe2'

/* ── analytics stat tile ──────────────────────────────────── */
function StatTile({
  label,
  value,
  sub,
  className = ''
}: {
  label: string
  value: string
  sub?: string
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-[#10301d]/10 bg-[#fffdf7] p-5 shadow-[0_2px_16px_-8px_rgba(16,48,29,0.15)] ${className}`}
    >
      <p className="text-[11px] font-semibold tracking-widest text-[#10301d]/45 uppercase">
        {label}
      </p>
      <p className={`mt-1 text-2xl text-[#10301d] ${displayFont.className}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[12px] text-[#10301d]/40">{sub}</p>}
    </div>
  )
}

type GoalPair = { goal: Goal; calc: GoalCalc; color: string }

/* ── SIP allocation stacked bar ───────────────────────────── */
function SipAllocation({ pairs }: { pairs: GoalPair[] }) {
  const total = pairs.reduce((s, p) => s + p.calc.monthlySip, 0)
  if (total <= 0) return null

  return (
    <div className="rounded-2xl border border-[#10301d]/10 bg-[#fffdf7] p-6 shadow-[0_2px_16px_-8px_rgba(16,48,29,0.15)]">
      <h3 className={`mb-4 text-lg text-[#10301d] ${displayFont.className}`}>
        Monthly SIP allocation
      </h3>

      {/* stacked bar */}
      <div className="flex h-5 w-full overflow-hidden rounded-full">
        {pairs.map(({ goal, calc, color }) => {
          const pct = (calc.monthlySip / total) * 100
          return (
            <div
              key={goal.id}
              style={{ width: `${pct}%`, background: color }}
              title={`${goal.name}: ${inrWords(calc.monthlySip)}/mo (${pct.toFixed(0)}%)`}
            />
          )
        })}
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {pairs.map(({ goal, calc, color }) => {
          const pct = (calc.monthlySip / total) * 100
          return (
            <div key={goal.id} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: color }}
              />
              <span className="text-[12px] text-[#10301d]/60">
                {goal.icon} {goal.name}{' '}
                <span className="font-semibold text-[#10301d]/80">
                  {inrWords(calc.monthlySip)}/mo · {pct.toFixed(0)}%
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── goal timeline ────────────────────────────────────────── */
function GoalTimeline({ pairs }: { pairs: GoalPair[] }) {
  const sorted = [...pairs].sort((a, b) => a.goal.years - b.goal.years)
  const maxYears = Math.max(...pairs.map(p => p.goal.years), 1)

  return (
    <div className="rounded-2xl border border-[#10301d]/10 bg-[#fffdf7] p-6 shadow-[0_2px_16px_-8px_rgba(16,48,29,0.15)]">
      <h3 className={`mb-5 text-lg text-[#10301d] ${displayFont.className}`}>
        Goal timeline
      </h3>

      <div className="space-y-3">
        {sorted.map(({ goal, color }) => {
          const pct = (goal.years / maxYears) * 100
          return (
            <div key={goal.id} className="flex items-center gap-3">
              <div className="flex w-28 shrink-0 items-center gap-1.5 overflow-hidden">
                <span className="shrink-0 text-base">{goal.icon}</span>
                <span className="truncate text-[12px] text-[#10301d]/60">
                  {goal.name}
                </span>
              </div>
              <div className="relative h-7 flex-1">
                <div
                  className="flex h-full items-center justify-end overflow-hidden rounded-r-full pr-2.5"
                  style={{
                    width: `${pct}%`,
                    background: color,
                    opacity: 0.88,
                    minWidth: 48
                  }}
                >
                  <span className="text-[11px] font-semibold text-white/90">
                    {goal.years} yr
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-[#10301d]/35">
        <span>Now</span>
        <span>{maxYears} years</span>
      </div>
    </div>
  )
}

/* ── empty state ──────────────────────────────────────────── */
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 text-7xl">🌱</div>
      <h2 className={`mb-3 text-2xl text-[#10301d] ${displayFont.className}`}>
        Start building your future
      </h2>
      <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-[#10301d]/55">
        Create your first financial goal and find out exactly how much to invest
        each month to get there.
      </p>
      <button
        onClick={onNew}
        className="rounded-full bg-[#1d4d31] px-7 py-3 text-[14px] font-semibold text-[#f4efe2] shadow-[0_4px_24px_-8px_rgba(16,48,29,0.5)] transition-colors hover:bg-[#10301d]"
      >
        Create your first goal →
      </button>
    </div>
  )
}

/* ── clear-data popover ───────────────────────────────────── */
function ClearPopover({
  onClear,
  onClose
}: {
  onClear: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on Escape or a click anywhere outside the popover.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Confirm deleting all goals"
      className="absolute top-11 right-0 z-10 w-60 rounded-xl border border-[#10301d]/10 bg-white p-4 shadow-xl"
    >
      <p className="mb-3 text-[13px] leading-snug text-[#10301d]/70">
        Delete all goals? This can&rsquo;t be undone.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            onClear()
            onClose()
          }}
          className="flex-1 rounded-lg bg-red-500 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-600"
        >
          Delete all
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded-lg bg-[#10301d]/8 py-1.5 text-[13px] font-medium text-[#10301d]/70 transition-colors hover:bg-[#10301d]/15"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ── dashboard ────────────────────────────────────────────── */
export function Dashboard({
  goals,
  storageError = false,
  onAdd,
  onOpen,
  onDelete,
  onClear,
  onImport
}: {
  goals: Goal[]
  storageError?: boolean
  onAdd: (goal: Goal) => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onClear: () => void
  onImport: (goals: Goal[]) => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [showClear, setShowClear] = useState(false)
  const [importMsg, setImportMsg] = useState<{
    kind: 'ok' | 'err'
    text: string
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pairs = useMemo<GoalPair[]>(
    () =>
      goals.map((goal, i) => ({
        goal,
        calc: calcGoal(goal),
        color: CHART_PALETTE[i % CHART_PALETTE.length] ?? '#1d4d31'
      })),
    [goals]
  )
  const totalSip = pairs.reduce((s, p) => s + p.calc.monthlySip, 0)
  const totalTarget = pairs.reduce((s, p) => s + p.calc.nominalTarget, 0)
  const maxYears = goals.length ? Math.max(...goals.map(g => g.years)) : 0

  const hasGoals = goals.length > 0

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseGoalsFile(String(reader.result))
        onImport(imported)
        setImportMsg({
          kind: 'ok',
          text: `Imported ${imported.length} ${imported.length === 1 ? 'goal' : 'goals'}.`
        })
      } catch (err) {
        setImportMsg({
          kind: 'err',
          text: err instanceof Error ? err.message : 'Could not read that file.'
        })
      }
    }
    reader.onerror = () =>
      setImportMsg({ kind: 'err', text: 'Could not read that file.' })
    reader.readAsText(file)
  }

  const handleShare = async () => {
    const url = buildShareUrl(goals)
    try {
      await navigator.clipboard.writeText(url)
      setImportMsg({
        kind: 'ok',
        text: 'Share link copied to clipboard. Anyone who opens it gets these goals.'
      })
    } catch {
      // Clipboard can be blocked (e.g. insecure context); fall back to a prompt.
      window.prompt('Copy your share link:', url)
    }
  }

  return (
    <main
      className="min-h-screen w-full px-5 py-12 sm:px-8 sm:py-16"
      style={{
        background: `radial-gradient(120% 90% at 85% 0%, ${CREAM} 0%, #ece4d2 60%, #e4dac4 100%)`
      }}
    >
      <div className="mx-auto max-w-5xl">
        {/* ── header ───────────────────────────────────────── */}
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-[#b5893a] uppercase">
              <span className="h-px w-8 bg-[#b5893a]" />
              Financial Planner
            </p>
            <h1
              className={`text-4xl leading-[1.05] text-[#10301d] sm:text-5xl ${displayFont.className}`}
            >
              My <span className="text-[#b5893a] italic">Goals</span>
            </h1>
            {hasGoals && (
              <p className="mt-3 text-[15px] text-[#10301d]/55">
                {goals.length} {goals.length === 1 ? 'goal' : 'goals'} · ₹
                {inrWords(totalSip).replace('₹', '')}/mo total SIP
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:pt-1">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFile}
              className="hidden"
            />

            {/* import */}
            <button
              onClick={() => fileRef.current?.click()}
              title="Import goals from a JSON file"
              aria-label="Import goals from a JSON file"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#10301d]/20 text-[#10301d]/45 transition-colors hover:border-[#1d4d31]/50 hover:text-[#1d4d31]"
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
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 16V4m0 0l-4 4m4-4l4 4"
                />
              </svg>
            </button>

            {/* share via link */}
            {hasGoals && (
              <button
                onClick={handleShare}
                title="Copy a shareable link to these goals"
                aria-label="Copy a shareable link to these goals"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#10301d]/20 text-[#10301d]/45 transition-colors hover:border-[#1d4d31]/50 hover:text-[#1d4d31]"
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            )}

            {/* export */}
            {hasGoals && (
              <button
                onClick={() => downloadGoals(goals)}
                title="Export goals to a JSON file"
                aria-label="Export goals to a JSON file"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#10301d]/20 text-[#10301d]/45 transition-colors hover:border-[#1d4d31]/50 hover:text-[#1d4d31]"
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
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"
                  />
                </svg>
              </button>
            )}

            {hasGoals && (
              <div className="relative">
                <button
                  onClick={() => setShowClear(v => !v)}
                  title="Clear all data"
                  aria-label="Clear all data"
                  aria-haspopup="dialog"
                  aria-expanded={showClear}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#10301d]/20 text-[#10301d]/35 transition-colors hover:border-red-300 hover:text-red-400"
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
                {showClear && (
                  <ClearPopover
                    onClear={onClear}
                    onClose={() => setShowClear(false)}
                  />
                )}
              </div>
            )}

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-full bg-[#1d4d31] px-5 py-2.5 text-[13px] font-semibold text-[#f4efe2] shadow-[0_4px_20px_-8px_rgba(16,48,29,0.5)] transition-colors hover:bg-[#10301d]"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Goal
            </button>
          </div>
        </header>

        {/* ── storage failure warning ──────────────────────── */}
        {storageError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800"
          >
            Your browser is blocking local storage, so changes won&rsquo;t be
            saved between visits. Export your goals to keep a copy.
          </div>
        )}

        {/* ── import status banner ─────────────────────────── */}
        {importMsg && (
          <div
            className={`mb-6 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[13px] ${
              importMsg.kind === 'ok'
                ? 'border-[#1d4d31]/25 bg-[#1d4d31]/8 text-[#10301d]'
                : 'border-red-300 bg-red-50 text-red-600'
            }`}
          >
            <span>{importMsg.text}</span>
            <button
              onClick={() => setImportMsg(null)}
              aria-label="Dismiss message"
              className="shrink-0 rounded-full px-2 py-0.5 text-current/60 transition-colors hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── content ──────────────────────────────────────── */}
        {!hasGoals ? (
          <EmptyState onNew={() => setShowModal(true)} />
        ) : (
          <div className="space-y-8">
            {/* summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <StatTile
                label="Total monthly SIP"
                value={inrWords(totalSip)}
                sub={`across ${goals.length} ${goals.length === 1 ? 'goal' : 'goals'}`}
                className="col-span-2 sm:col-span-1"
              />
              <StatTile
                label="Total target wealth"
                value={inrWords(totalTarget)}
              />
              <StatTile
                label="Longest horizon"
                value={`${maxYears} years`}
                sub="your biggest commitment"
              />
            </div>

            {/* analytics (only when >1 goal) */}
            {goals.length > 1 && (
              <>
                <SipAllocation pairs={pairs} />
                <GoalTimeline pairs={pairs} />
              </>
            )}

            {/* goal cards grid */}
            <div>
              {goals.length > 1 && (
                <h3
                  className={`mb-4 text-lg text-[#10301d]/70 ${displayFont.className}`}
                >
                  All goals
                </h3>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {goals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onClick={() => onOpen(goal.id)}
                    onDelete={() => onDelete(goal.id)}
                  />
                ))}

                {/* add another card */}
                <button
                  onClick={() => setShowModal(true)}
                  className="flex min-h-35 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#10301d]/15 text-[#10301d]/35 transition-all hover:border-[#1d4d31]/40 hover:text-[#1d4d31]/60"
                >
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-[13px] font-medium">
                    Add another goal
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* footer */}
        <p className="mt-10 text-center text-xs leading-relaxed text-[#10301d]/35">
          All data is stored locally in your browser. Nothing leaves your
          device.
        </p>
      </div>

      {showModal && (
        <NewGoalModal onClose={() => setShowModal(false)} onCreate={onAdd} />
      )}
    </main>
  )
}
