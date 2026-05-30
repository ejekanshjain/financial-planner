import type { Metadata, Viewport } from 'next'
import { ServiceWorkerRegister } from '~/components/ServiceWorkerRegister'
import {
  BACKGROUND_COLOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  THEME_COLOR
} from '~/lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — SIP Goal Calculator for Indian Investors`,
    template: `%s · ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'SIP calculator',
    'financial planner',
    'mutual fund SIP',
    'goal based investing',
    'step up SIP',
    'retirement planning',
    'investment calculator',
    'India',
    'lakhs',
    'crores'
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'finance',
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/'
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' }
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }]
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — SIP Goal Calculator`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_IN',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: `${SITE_NAME} logo`
      }
    ]
  },
  twitter: {
    card: 'summary',
    title: `${SITE_NAME} — SIP Goal Calculator`,
    description: SITE_DESCRIPTION,
    images: ['/icon-512.png']
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME
  },
  formatDetection: {
    telephone: false
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BACKGROUND_COLOR },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLOR }
  ],
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
