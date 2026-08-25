'use client'

import { useEffect, useRef, useState } from 'react'
import { displayFont } from '~/lib/fonts'
import {
  currencyForRegion,
  currencyName,
  listCurrencies,
  listRegions,
  POPULAR_CURRENCIES,
  POPULAR_REGIONS,
  regionName
} from '~/lib/locale'
import { usePlannerLocale } from './LocaleProvider'
import { SearchSelect } from './SearchSelect'

export function RegionSwitcher() {
  const { locale, setLocale, symbol } = usePlannerLocale()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(locale)
  const ref = useRef<HTMLDivElement>(null)
  const region = draft.region
  const currency = draft.currency

  const close = () => setOpen(false)
  const openMenu = () => {
    setDraft(locale)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const pickRegion = (code: string) => {
    setDraft({ region: code, currency: currencyForRegion(code) })
  }

  const apply = () => {
    setLocale({ region, currency })
    close()
  }

  const regionOptions = listRegions().map(r => ({
    value: r.code,
    label: r.name,
    hint: r.code
  }))
  const currencyOptions = listCurrencies().map(c => ({
    value: c.code,
    label: c.name,
    hint: c.code
  }))

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : openMenu())}
        title={`${regionName(locale.region)} · ${currencyName(locale.currency)}`}
        aria-label="Change region and currency"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-full border border-[#10301d]/20 px-3 text-[12px] font-semibold text-[#10301d]/60 transition-colors hover:border-[#1d4d31]/50 hover:text-[#1d4d31]"
      >
        <span className={`text-[13px] ${displayFont.className}`}>{symbol}</span>
        <span>{locale.currency}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Region and currency"
          className="absolute top-11 right-0 z-20 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-[#10301d]/10 bg-[#fffdf7] p-4 shadow-xl"
        >
          <p className={`text-[15px] text-[#10301d] ${displayFont.className}`}>
            Region & currency
          </p>
          <p className="mt-1 mb-4 text-[12px] leading-snug text-[#10301d]/50">
            Amounts are not converted. Only labels, formatting, and new-goal
            defaults change.
          </p>
          <div className="space-y-3">
            <SearchSelect
              label="Region"
              value={region}
              options={regionOptions}
              onChange={pickRegion}
              placeholder="Search countries…"
              popularCount={POPULAR_REGIONS.length}
              restHeading="All regions"
            />
            <SearchSelect
              label="Currency"
              value={currency}
              options={currencyOptions}
              onChange={code => setDraft(d => ({ ...d, currency: code }))}
              placeholder="Search currencies…"
              popularCount={POPULAR_CURRENCIES.length}
              restHeading="All currencies"
            />
          </div>
          <button
            type="button"
            onClick={apply}
            className="mt-4 w-full rounded-xl bg-[#1d4d31] py-2.5 text-[13px] font-semibold text-[#f4efe2] transition-colors hover:bg-[#10301d]"
          >
            Use {regionName(region)} · {currency}
          </button>
        </div>
      )}
    </div>
  )
}
