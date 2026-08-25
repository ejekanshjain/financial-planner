'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

export type SearchOption = {
  value: string
  label: string
  hint?: string
}

export function SearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Search…',
  popularCount = 0,
  restHeading = 'All'
}: {
  label: string
  value: string
  options: SearchOption[]
  onChange: (value: string) => void
  placeholder?: string
  /** First N options are shown under a "Popular" heading. */
  popularCount?: number
  restHeading?: string
}) {
  const listId = useId()
  const buttonId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = options.find(o => o.value === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      o =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.hint && o.hint.toLowerCase().includes(q))
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  const showPopular = open && !query && popularCount > 0
  const popular = showPopular ? filtered.slice(0, popularCount) : []
  const rest = showPopular ? filtered.slice(popularCount) : filtered

  return (
    <div ref={wrapRef} className="relative">
      <label
        htmlFor={buttonId}
        className="text-[12px] font-semibold tracking-widest text-[#10301d]/55 uppercase"
      >
        {label}
      </label>
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={
          selected ? `${label}: ${selected.label}` : `${label}: ${placeholder}`
        }
        onClick={() => {
          setOpen(o => !o)
          setQuery('')
          setActive(0)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-xl border border-[#10301d]/15 bg-white px-4 py-2.5 text-left text-[15px] text-[#10301d] transition outline-none focus:border-[#b5893a] focus:ring-2 focus:ring-[#b5893a]/25"
      >
        <span className="min-w-0 truncate">
          {selected ? (
            <>
              {selected.label}
              {selected.hint && (
                <span className="ml-2 text-[13px] text-[#10301d]/40">
                  {selected.hint}
                </span>
              )}
            </>
          ) : (
            <span className="text-[#10301d]/35">{placeholder}</span>
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-[#10301d]/35 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 left-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-[#10301d]/12 bg-white shadow-[0_16px_40px_-16px_rgba(16,48,29,0.35)]">
          <div className="border-b border-[#10301d]/8 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActive(i => Math.min(i + 1, filtered.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive(i => Math.max(i - 1, 0))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  const hit = filtered[active]
                  if (hit) pick(hit.value)
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  setOpen(false)
                  setQuery('')
                }
              }}
              placeholder={placeholder}
              className="w-full rounded-lg bg-[#10301d]/4 px-3 py-2 text-[14px] text-[#10301d] outline-none placeholder:text-[#10301d]/35"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-[13px] text-[#10301d]/45">
                Nothing matches “{query}”
              </li>
            )}
            {popular.length > 0 && (
              <li className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest text-[#10301d]/40 uppercase">
                Popular
              </li>
            )}
            {popular.map((o, i) => (
              <OptionRow
                key={o.value}
                option={o}
                active={i === active}
                selected={o.value === value}
                onHover={() => setActive(i)}
                onPick={() => pick(o.value)}
              />
            ))}
            {showPopular && rest.length > 0 && (
              <li className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest text-[#10301d]/40 uppercase">
                {restHeading}
              </li>
            )}
            {rest.map((o, i) => {
              const idx = popular.length + i
              return (
                <OptionRow
                  key={o.value}
                  option={o}
                  active={idx === active}
                  selected={o.value === value}
                  onHover={() => setActive(idx)}
                  onPick={() => pick(o.value)}
                />
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function OptionRow({
  option,
  active,
  selected,
  onHover,
  onPick
}: {
  option: SearchOption
  active: boolean
  selected: boolean
  onHover: () => void
  onPick: () => void
}) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onMouseEnter={onHover}
        onClick={onPick}
        className={`flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left text-[14px] ${
          active ? 'bg-[#1d4d31]/10' : ''
        } ${selected ? 'font-semibold text-[#10301d]' : 'text-[#10301d]/80'}`}
      >
        <span className="min-w-0 truncate">{option.label}</span>
        {option.hint && (
          <span className="shrink-0 text-[12px] text-[#10301d]/40">
            {option.hint}
          </span>
        )}
      </button>
    </li>
  )
}
