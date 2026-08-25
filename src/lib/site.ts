/**
 * Canonical site URL used for SEO metadata, sitemap, robots and Open Graph.
 * Override per-environment with NEXT_PUBLIC_SITE_URL (no trailing slash);
 * falls back to the production domain so absolute URLs are always well-formed.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://financial-planner-teal-delta.vercel.app'
).replace(/\/$/, '')

export const SITE_NAME = 'Financial Planner'

export const SITE_DESCRIPTION =
  'Plan investments goal by goal in INR, USD, GBP, EUR and any other currency your browser knows. Calculate the monthly amount needed to reach a house, retirement or education target — with step-up, inflation and lump-sum support. Free, private, and works offline.'

/** Brand colours shared between the manifest and theme-color meta. */
export const THEME_COLOR = '#10301d'
export const BACKGROUND_COLOR = '#fffdf7'
