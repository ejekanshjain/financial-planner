import { describe, expect, it } from 'vitest'
import { CRORE } from './goals'
import {
  currencyForRegion,
  formatCompact,
  formatMoney,
  listCurrencies,
  listRegions,
  POPULAR_CURRENCIES,
  POPULAR_REGIONS,
  profileFor
} from './locale'

const IN = { region: 'IN', currency: 'INR' } as const
const US = { region: 'US', currency: 'USD' } as const
const GB = { region: 'GB', currency: 'GBP' } as const
const DE = { region: 'DE', currency: 'EUR' } as const

describe('listRegions', () => {
  it('pins India, United States and United Kingdom at the top', () => {
    const regions = listRegions('en')
    expect(regions.length).toBeGreaterThan(200)
    expect(regions.slice(0, 3).map(r => r.code)).toEqual([...POPULAR_REGIONS])
    expect(regions.find(r => r.code === 'IN')?.name).toBe('India')
    expect(regions.find(r => r.code === 'US')?.name).toBe('United States')
    expect(regions.find(r => r.code === 'GB')?.name).toBe('United Kingdom')
    expect(regions.find(r => r.code === 'DE')?.name).toBe('Germany')
    expect(regions.find(r => r.code === 'DD')).toBeUndefined()
  })
})

describe('listCurrencies', () => {
  it('pins INR, USD, GBP and EUR at the top', () => {
    const currencies = listCurrencies('en')
    expect(currencies.length).toBeGreaterThan(100)
    expect(currencies.slice(0, 4).map(c => c.code)).toEqual([
      ...POPULAR_CURRENCIES
    ])
  })
})

describe('currencyForRegion', () => {
  it('auto-fills the usual currency for popular and eurozone regions', () => {
    expect(currencyForRegion('IN')).toBe('INR')
    expect(currencyForRegion('US')).toBe('USD')
    expect(currencyForRegion('GB')).toBe('GBP')
    expect(currencyForRegion('DE')).toBe('EUR')
    expect(currencyForRegion('FR')).toBe('EUR')
    expect(currencyForRegion('JP')).toBe('JPY')
    expect(currencyForRegion('AE')).toBe('AED')
  })
})

describe('formatMoney', () => {
  it('uses Indian grouping for INR', () => {
    expect(formatMoney(1234567, IN)).toBe('₹12,34,567')
    expect(formatMoney(100000, IN)).toBe('₹1,00,000')
    expect(formatMoney(0, IN)).toBe('₹0')
  })

  it('uses western grouping for USD, GBP and EUR', () => {
    expect(formatMoney(1234567, US)).toBe('$1,234,567')
    expect(formatMoney(1234567, GB)).toBe('£1,234,567')
    expect(formatMoney(1234567, DE)).toBe('€1,234,567')
  })

  it('rounds and guards non-finite input', () => {
    expect(formatMoney(1234.6, IN)).toBe('₹1,235')
    expect(formatMoney(NaN, IN)).toBe('₹0')
    expect(formatMoney(Infinity, US)).toBe('$0')
  })
})

describe('formatCompact', () => {
  it('labels crores and lakhs for INR', () => {
    expect(formatCompact(1 * CRORE, IN)).toBe('₹1 Cr')
    expect(formatCompact(12345678, IN)).toBe('₹1.23 Cr')
    expect(formatCompact(50e5, IN)).toBe('₹50 L')
    expect(formatCompact(1500, IN)).toBe('₹1.5 K')
    expect(formatCompact(2 * CRORE, IN)).toBe('₹2 Cr')
  })

  it('labels millions for USD', () => {
    expect(formatCompact(1_000_000, US)).toBe('$1M')
    expect(formatCompact(1_500_000, US)).toBe('$1.5M')
    expect(formatCompact(2500, US)).toBe('$2.5K')
  })

  it('can omit the currency symbol for chips', () => {
    expect(formatCompact(1 * CRORE, IN, { symbol: false })).toBe('1 Cr')
    expect(formatCompact(1_000_000, US, { symbol: false })).toBe('1M')
  })
})

describe('profileFor', () => {
  it('keeps Indian SIP defaults and terminology for India', () => {
    const p = profileFor(IN)
    expect(p.defaults.target).toBe(1 * CRORE)
    expect(p.defaults.annualReturn).toBe(12)
    expect(p.copy.contribution).toBe('SIP')
    expect(p.copy.monthlyContribution).toBe('Monthly SIP')
  })

  it('uses dollar-scale defaults and contribution wording for the US', () => {
    const p = profileFor(US)
    expect(p.defaults.target).toBe(1_000_000)
    expect(p.defaults.annualReturn).toBe(8)
    expect(p.defaults.inflation).toBe(3)
    expect(p.copy.contribution).toBe('contribution')
    expect(p.copy.monthlyContribution).toBe('Monthly contribution')
  })

  it('uses pound-scale defaults for the UK', () => {
    const p = profileFor(GB)
    expect(p.defaults.target).toBe(500_000)
    expect(p.copy.contribution).toBe('contribution')
  })

  it('uses euro defaults for Germany', () => {
    const p = profileFor(DE)
    expect(p.defaults.target).toBe(500_000)
    expect(p.defaults.inflation).toBe(2)
    expect(p.copy.contribution).toBe('contribution')
  })
})
