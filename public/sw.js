/* Financial Planner service worker.
 * Gives the app an installable, offline-capable PWA shell. The planner itself
 * stores everything in localStorage, so once the shell is cached the whole
 * calculator works with no network. The AI chat (/api/*) always needs the
 * network and is intentionally never cached. */

const VERSION = 'v2'
const CACHE = `fin-planner-${VERSION}`

// Minimal shell to pre-cache so the app opens offline on a cold start. The PDF
// fonts are included so the very first plan export also works fully offline.
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/fonts/NotoSans-Regular.ttf',
  '/fonts/NotoSans-Bold.ttf'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Pre-cache best-effort: a single 404/redirect shouldn't abort install.
      .then(cache => cache.addAll(PRECACHE).catch(() => {}))
  )
  // Note: we deliberately do NOT call skipWaiting() here. On an update the new
  // worker waits so the page can prompt the user; it activates only when the
  // client posts SKIP_WAITING (see the message handler below).
})

// The update toast asks the waiting worker to take over on the user's command.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never cache the streaming AI endpoint — it must hit the network.
  if (url.pathname.startsWith('/api/')) return

  // App navigations: network-first so users get fresh HTML, falling back to the
  // cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then(cached => cached || caches.match('/'))
        )
    )
    return
  }

  // Static assets: stale-while-revalidate for instant loads that still update.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then(cache => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
