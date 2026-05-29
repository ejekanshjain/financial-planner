'use client'

import { useEffect } from 'react'

/**
 * Last-resort boundary for errors thrown in the root layout itself (which the
 * route-level `error.tsx` cannot catch). It must render its own <html>/<body>
 * because it replaces the entire document on failure.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Fatal error:', error)
  }, [error])

  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="flex min-h-full flex-col items-center justify-center px-5 py-12 text-center"
        style={{ background: '#f4efe2', color: '#10301d', fontFamily: 'system-ui, sans-serif' }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🌧️</div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
          Something went wrong
        </h1>
        <p style={{ maxWidth: '24rem', opacity: 0.6, lineHeight: 1.6, marginBottom: '2rem' }}>
          The app hit an unexpected error. Your saved goals are safe in this
          browser — try reloading.
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: '9999px',
            background: '#1d4d31',
            color: '#f4efe2',
            padding: '0.75rem 1.75rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
