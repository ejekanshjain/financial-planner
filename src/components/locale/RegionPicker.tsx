'use client'

import { useMemo, useState } from 'react'
import { displayFont } from '~/lib/fonts'
import {
  currencyForRegion,
  currencyName,
  currencySymbol,
  formatCompact,
  formatMoney,
  listCurrencies,
  listRegions,
  PlannerLocale,
  POPULAR_CURRENCIES,
  POPULAR_REGIONS,
  profileFor,
  regionName
} from '~/lib/locale'
import { SearchSelect } from './SearchSelect'

const CREAM = '#f4efe2'

export function RegionPicker({
  suggested,
  initial,
  onConfirm,
  onCancel
}: {
  suggested: PlannerLocale | null
  initial?: PlannerLocale | null
  onConfirm: (locale: PlannerLocale) => void
  onCancel?: () => void
}) {
  const start = initial ?? suggested
  const [region, setRegion] = useState(start?.region ?? '')
  const [currency, setCurrency] = useState(start?.currency ?? '')

  const regions = useMemo(() => listRegions(), [])
  const currencies = useMemo(() => listCurrencies(), [])

  const regionOptions = useMemo(
    () => regions.map(r => ({ value: r.code, label: r.name, hint: r.code })),
    [regions]
  )
  const currencyOptions = useMemo(
    () =>
      currencies.map(c => ({
        value: c.code,
        label: c.name,
        hint: c.code
      })),
    [currencies]
  )

  const pickRegion = (code: string) => {
    setRegion(code)
    setCurrency(currencyForRegion(code))
  }

  const ready = region.length === 2 && currency.length === 3
  const loc: PlannerLocale | null = ready ? { region, currency } : null
  const preview = loc
    ? {
        money: formatMoney(profileFor(loc).defaults.target, loc),
        compact: formatCompact(profileFor(loc).defaults.target, loc),
        symbol: currencySymbol(loc),
        contribution: profileFor(loc).copy.monthlyContribution
      }
    : null

  return (
    <main
      className="flex min-h-screen w-full items-center justify-center px-5 py-12"
      style={{
        background: `radial-gradient(120% 90% at 85% 0%, ${CREAM} 0%, #ece4d2 60%, #e4dac4 100%)`
      }}
    >
      <div className="w-full max-w-lg">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-[#b5893a] uppercase">
          <span className="h-px w-8 bg-[#b5893a]" />
          Plan from
        </p>
        <h1
          className={`text-4xl leading-[1.1] text-[#10301d] sm:text-5xl ${displayFont.className}`}
        >
          Where is this <span className="text-[#b5893a] italic">money?</span>
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#10301d]/60">
          Pick a region. We&rsquo;ll fill in its currency — change it if you
          plan in something else. You can switch later.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-2.5">
          {POPULAR_REGIONS.map(code => {
            const selected = region === code
            const cur = currencyForRegion(code)
            const cardLoc = { region: code, currency: cur }
            return (
              <button
                key={code}
                type="button"
                onClick={() => pickRegion(code)}
                aria-pressed={selected}
                className={`rounded-2xl border px-3 py-4 text-left transition-all ${
                  selected
                    ? 'border-[#1d4d31] bg-[#1d4d31] text-[#f4efe2] shadow-[0_8px_24px_-12px_rgba(16,48,29,0.55)]'
                    : 'border-[#10301d]/10 bg-[#fffdf7] text-[#10301d] hover:border-[#1d4d31]/40'
                }`}
              >
                <p
                  className={`text-3xl leading-none ${displayFont.className} ${
                    selected ? 'text-[#f4efe2]' : 'text-[#1d4d31]'
                  }`}
                >
                  {currencySymbol(cardLoc)}
                </p>
                <p className="mt-3 text-[13px] leading-tight font-semibold">
                  {regionName(code)}
                </p>
                <p
                  className={`mt-0.5 text-[11px] ${
                    selected ? 'text-[#f4efe2]/60' : 'text-[#10301d]/40'
                  }`}
                >
                  {cur}
                  {suggested?.region === code ? ' · suggested' : ''}
                </p>
              </button>
            )
          })}
        </div>

        <div className="mt-8 space-y-4 rounded-2xl border border-[#10301d]/10 bg-[#fffdf7] p-5 sm:p-6">
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
            onChange={setCurrency}
            placeholder="Search currencies…"
            popularCount={POPULAR_CURRENCIES.length}
            restHeading="All currencies"
          />
          {preview && (
            <p className="rounded-xl bg-[#10301d]/4 px-3.5 py-3 text-[13px] leading-relaxed text-[#10301d]/65">
              We&rsquo;ll write amounts as{' '}
              <span className="font-semibold text-[#10301d]">
                {preview.money}
              </span>
              {' · '}
              {preview.compact}, and call a monthly investment a{' '}
              <span className="font-semibold text-[#10301d]">
                {preview.contribution.toLowerCase()}
              </span>
              .
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={!ready}
            onClick={() => loc && onConfirm(loc)}
            className="flex-1 rounded-xl bg-[#1d4d31] py-3 text-[14px] font-semibold text-[#f4efe2] shadow-[0_4px_20px_-8px_rgba(16,48,29,0.5)] transition-colors hover:bg-[#10301d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start planning →
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-5 py-3 text-[14px] font-medium text-[#10301d]/55 transition-colors hover:text-[#10301d]"
            >
              Cancel
            </button>
          )}
        </div>

        {suggested && !initial && (
          <p className="mt-4 text-center text-[12px] text-[#10301d]/40">
            Detected {regionName(suggested.region)} ·{' '}
            {currencyName(suggested.currency)} from this browser.
          </p>
        )}
      </div>
    </main>
  )
}
