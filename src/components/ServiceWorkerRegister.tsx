'use client'

import { useEffect } from 'react'

/**
 * Registers the PWA service worker on the client after load. Renders nothing.
 * Registration is skipped in development so the SW cache doesn't interfere with
 * hot reloading and fresh builds.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(err => console.warn('Service worker registration failed:', err))
    }

    // Wait for load so the SW never competes with the initial render.
    if (document.readyState === 'complete') {
      register()
      return
    }
    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
