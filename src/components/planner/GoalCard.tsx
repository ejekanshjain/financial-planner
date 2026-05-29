'use client'

import { useMemo } from 'react'
import { displayFont } from '~/lib/fonts'
import { Goal, calcGoal, inrWords } from '~/lib/goals'

export function GoalCard({
  goal,
  onClick
}: {
  goal: Goal
  onClick: () => void
}) {
  const calc = useMemo(() => calcGoal(goal), [goal])
  const investedPct =
    goal.target > 0 ? Math.min(100, (calc.invested / goal.target) * 100) : 0

  return (
    <button
      onClick={onClick}
      className="group w-full cursor-pointer rounded-2xl border border-[#10301d]/10 bg-[#fffdf7] p-5 text-left shadow-[0_2px_20px_-10px_rgba(16,48,29,0.18)] transition-all duration-200 hover:border-[#10301d]/25 hover:shadow-[0_8px_32px_-10px_rgba(16,48,29,0.28)]"
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
            <span className="mt-1 inline-block rounded-full bg-[#10301d]/8 px-2 py-0.5 text-[11px] font-medium text-[#10301d]/55">
              {goal.years} yr goal
            </span>
          </div>
        </div>
        <svg
          className="mt-1 h-4 w-4 shrink-0 text-[#10301d]/25 transition-colors group-hover:text-[#1d4d31]/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#10301d]/45 uppercase">
            Target
          </p>
          <p
            className={`mt-0.5 text-[22px] leading-none text-[#10301d] ${displayFont.className}`}
          >
            {inrWords(goal.target)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#10301d]/45 uppercase">
            Monthly SIP
          </p>
          <p
            className={`mt-0.5 text-[22px] leading-none text-[#1d4d31] ${displayFont.className}`}
          >
            {inrWords(calc.monthlySip)}
          </p>
        </div>
      </div>

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
    </button>
  )
}
