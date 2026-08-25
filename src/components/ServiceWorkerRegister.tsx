'use client'

import { useEffect, useState } from 'react'

/**
 * Registers the PWA service worker and surfaces a "new version available" toast
 * when an updated worker is waiting. Registration is skipped in development so
 * the SW cache doesn't interfere with hot reloading and fresh builds.
 *
 * Update flow: the SW does not call skipWaiting() on install, so an updated
 * worker sits in `waiting` while the current one keeps controlling the page. We
 * detect it, show the toast, and on the user's click post SKIP_WAITING; the
 * resulting `controllerchange` reloads the page onto the new version.
 */
export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | undefined

    // Only treat a waiting worker as an "update" when a controller already
    // exists — on a first install there's nothing to replace.
    const flagWaiting = (worker: ServiceWorker | null) => {
      if (worker && navigator.serviceWorker.controller) setWaiting(worker)
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => {
          registration = reg
          flagWaiting(reg.waiting)
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing
            if (!installing) return
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed') flagWaiting(installing)
            })
          })
        })
        .catch(err => console.warn('Service worker registration failed:', err))
    }

    // Wait for load so the SW never competes with the initial render.
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register)

    // Re-check for a new build whenever the tab regains focus.
    const onVisible = () => {
      if (document.visibilityState === 'visible') registration?.update()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('load', register)
    }
  }, [])

  if (!waiting) return null

  // Activate the waiting worker, then reload once it takes control. Scoping the
  // reload to this click avoids the spurious first-install reload that a global
  // controllerchange listener would trigger when the SW first claims the page.
  const applyUpdate = () => {
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => window.location.reload(),
      { once: true }
    )
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-50 flex max-w-[min(20rem,calc(100vw-2.5rem))] items-center gap-3 rounded-2xl border border-[#f4efe2]/15 bg-[#10301d] px-4 py-3 text-[#f4efe2] shadow-[0_18px_50px_-18px_rgba(16,48,29,0.7)]"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">New version available</p>
        <p className="text-[11px] text-[#f4efe2]/60">
          Reload to get the latest update.
        </p>
      </div>
      <button
        onClick={applyUpdate}
        className="shrink-0 rounded-full bg-[#b5893a] px-3.5 py-1.5 text-[12px] font-semibold text-[#10301d] transition-colors hover:bg-[#c79b48]"
      >
        Reload
      </button>
      <button
        onClick={() => setWaiting(null)}
        aria-label="Dismiss update notification"
        className="shrink-0 rounded-full px-1.5 text-[#f4efe2]/45 transition-colors hover:text-[#f4efe2]/80"
      >
        ✕
      </button>
    </div>
  )
}
