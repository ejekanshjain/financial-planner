'use client'

import { useMemo, useState } from 'react'
import { displayFont } from '~/lib/fonts'
import { calcGoal, calcSwp, formatYearsMonths, Goal, inrWords } from '~/lib/goals'

export function GoalCard({
  goal,
  onClick,
  onDelete
}: {
  goal: Goal
  onClick: () => void
  onDelete: () => void
}) {
  const isSwp = goal.mode === 'swp'
  const calc = useMemo(() => calcGoal(goal), [goal])
  const swp = useMemo(() => calcSwp(goal), [goal])
  const investedPct =
    calc.nominalTarget > 0
      ? Math.min(100, (calc.invested / calc.nominalTarget) * 100)
      : 0
  // How much of the planning horizon the corpus actually covers (capped at 100%).
  const coveragePct = Math.min(
    100,
    (swp.lastsMonths / Math.max(1, goal.years * 12)) * 100
  )
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="group relative w-full cursor-pointer rounded-2xl border border-[#10301d]/10 bg-[#fffdf7] p-5 text-left shadow-[0_2px_20px_-10px_rgba(16,48,29,0.18)] transition-all duration-200 hover:border-[#10301d]/25 hover:shadow-[0_8px_32px_-10px_rgba(16,48,29,0.28)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{goal.icon}</span>
          <div>
            <h3
              className={`text-[15px] leading-tight font-medium text-[#10301d] ${displayFont.className}`}
            >
              {goal.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-block rounded-full bg-[#10301d]/8 px-2 py-0.5 text-[11px] font-medium text-[#10301d]/55">
                {goal.years} yr {isSwp ? 'plan' : 'goal'}
              </span>
              <span className="inline-block rounded-full bg-[#b5893a]/15 px-2 py-0.5 text-[11px] font-medium text-[#8a6722]">
                {isSwp ? 'withdrawal' : goal.mode === 'sip' ? 'by SIP' : 'by target'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-0.5 flex shrink-0 items-center gap-1">
          {/* delete button — appears on hover/focus */}
          <button
            type="button"
            title="Delete goal"
            aria-label={`Delete ${goal.name}`}
            onClick={e => {
              e.stopPropagation()
              setConfirmDelete(true)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#10301d]/30 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
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
          <svg
            className="h-4 w-4 text-[#10301d]/25 transition-colors group-hover:text-[#1d4d31]/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#10301d]/45 uppercase">
            {isSwp ? 'Corpus' : goal.mode === 'sip' ? 'Projected' : 'Target'}
          </p>
          <p
            className={`mt-0.5 text-[22px] leading-none text-[#10301d] ${displayFont.className}`}
          >
            {inrWords(isSwp ? swp.corpus : calc.nominalTarget)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#10301d]/45 uppercase">
            {isSwp ? 'Withdrawal' : 'Monthly SIP'}
          </p>
          <p
            className={`mt-0.5 text-[22px] leading-none text-[#1d4d31] ${displayFont.className}`}
          >
            {inrWords(isSwp ? swp.monthlyWithdrawal : calc.monthlySip)}
            {isSwp && (
              <span className="text-[13px] text-[#1d4d31]/55"> /mo</span>
            )}
          </p>
        </div>
      </div>

      {isSwp ? (
        <div className="mt-4 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#10301d]/8">
            <div
              className="h-full rounded-full bg-[#1d4d31]"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#10301d]/40">
            <span>
              Lasts{' '}
              {swp.sustainable
                ? '100+ yrs'
                : formatYearsMonths(swp.lastsMonths)}
            </span>
            <span>{inrWords(swp.totalWithdrawn)} drawn</span>
          </div>
        </div>
      ) : (
      <div className="mt-4 space-y-1.5">
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[#10301d]/8">
          <div
            className="h-full rounded-l-full bg-[#1d4d31]"
            style={{ width: `${investedPct}%` }}
          />
          <div className="h-full flex-1 bg-[#b5893a]" />
        </div>
        <div className="flex justify-between text-[10px] text-[#10301d]/40">
          <span>You invest {inrWords(calc.invested)}</span>
          <span>Market returns {inrWords(calc.gain)}</span>
        </div>
      </div>
      )}

      {/* delete confirmation overlay */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-label={`Delete ${goal.name}?`}
          onClick={e => e.stopPropagation()}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-[#fffdf7]/95 p-5 text-center backdrop-blur-sm"
        >
          <p className="text-[14px] text-[#10301d]/80">
            Delete{' '}
            <span className="font-semibold text-[#10301d]">{goal.name}</span>?
          </p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                onDelete()
              }}
              className="rounded-lg bg-red-500 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-600"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setConfirmDelete(false)
              }}
              className="rounded-lg bg-[#10301d]/8 px-4 py-1.5 text-[13px] font-medium text-[#10301d]/70 transition-colors hover:bg-[#10301d]/15"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
