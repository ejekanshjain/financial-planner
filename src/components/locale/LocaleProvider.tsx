'use client'

import { createContext, useContext, useMemo } from 'react'
import {
  currencySymbol,
  formatCompact,
  formatMoney,
  LocaleProfile,
  PlannerLocale,
  profileFor
} from '~/lib/locale'

type LocaleContextValue = {
  locale: PlannerLocale
  setLocale: (next: PlannerLocale) => void
  profile: LocaleProfile
  symbol: string
  formatMoney: (n: number) => string
  formatCompact: (n: number, opts?: { symbol?: boolean }) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  locale,
  onChange,
  children
}: {
  locale: PlannerLocale
  onChange: (next: PlannerLocale) => void
  children: React.ReactNode
}) {
  const value = useMemo<LocaleContextValue>(() => {
    const profile = profileFor(locale)
    return {
      locale,
      setLocale: onChange,
      profile,
      symbol: currencySymbol(locale),
      formatMoney: n => formatMoney(n, locale),
      formatCompact: (n, opts) => formatCompact(n, locale, opts)
    }
  }, [locale, onChange])

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function usePlannerLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('usePlannerLocale must be used within LocaleProvider')
  }
  return ctx
}
