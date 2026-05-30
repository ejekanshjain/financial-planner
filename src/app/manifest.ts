import type { MetadataRoute } from 'next'
import {
  BACKGROUND_COLOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  THEME_COLOR
} from '~/lib/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — SIP Goal Calculator`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    categories: ['finance', 'productivity', 'utilities'],
    lang: 'en-IN',
    dir: 'ltr',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  }
}
