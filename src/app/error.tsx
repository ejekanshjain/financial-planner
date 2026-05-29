'use client'

import { useEffect } from 'react'
import { displayFont } from '~/lib/fonts'

const CREAM = '#f4efe2'

/**
 * Route-level error boundary. Catches render/runtime errors thrown anywhere in
 * the planner so a single bad goal or unexpected state shows a recovery screen
 * instead of a blank white page. `reset()` re-renders the route in place.
 */
export default function PlannerError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the error in the console for debugging; nothing is sent anywhere.
    console.error('Planner crashed:', error)
  }, [error])

  return (
    <main
      className="flex min-h-screen w-full flex-col items-center justify-center px-5 py-12 text-center"
      style={{
        background: `radial-gradient(120% 90% at 85% 0%, ${CREAM} 0%, #ece4d2 60%, #e4dac4 100%)`
      }}
    >
      <div className="mb-6 text-7xl">🌧️</div>
      <h1 className={`mb-3 text-2xl text-[#10301d] ${displayFont.className}`}>
        Something went wrong
      </h1>
      <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-[#10301d]/55">
        The planner hit an unexpected error. Your saved goals are safe in this
        browser &mdash; try reloading the view.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-[#1d4d31] px-7 py-3 text-[14px] font-semibold text-[#f4efe2] shadow-[0_4px_24px_-8px_rgba(16,48,29,0.5)] transition-colors hover:bg-[#10301d]"
      >
        Try again
      </button>
    </main>
  )
}
