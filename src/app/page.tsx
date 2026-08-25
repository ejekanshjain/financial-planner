'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChatWidget } from '~/components/chat/ChatWidget'
import { LocaleProvider } from '~/components/locale/LocaleProvider'
import { RegionPicker } from '~/components/locale/RegionPicker'
import { Dashboard } from '~/components/planner/Dashboard'
import { GoalDetail } from '~/components/planner/GoalDetail'
import {
  clearGoalsStorage,
  consumeSharedGoals,
  Goal,
  loadGoals,
  saveGoals
} from '~/lib/goals'
import {
  loadLocale,
  PlannerLocale,
  saveLocale,
  suggestLocale
} from '~/lib/locale'

export default function FinancialPlanner() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [locale, setLocaleState] = useState<PlannerLocale | null>(null)
  const [suggested, setSuggested] = useState<PlannerLocale | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [storageError, setStorageError] = useState(false)
  // Bumped whenever the user clears all data, so the chat widget wipes itself.
  const [clearSignal, setClearSignal] = useState(0)

  useEffect(() => {
    const stored = loadGoals()
    // A shared link embeds goals in the URL; pull them in (merging by id) and
    // strip the param from the address bar so a refresh doesn't re-import.
    const shared = consumeSharedGoals()
    let next = stored
    if (shared) {
      const byId = new Map(stored.map(g => [g.id, g]))
      shared.goals.forEach(g => byId.set(g.id, g))
      next = [...byId.values()]
      saveGoals(next)
    }
    const fromShare = shared?.locale
    const storedLocale = loadLocale()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGoals(next)
    setLocaleState(fromShare ?? storedLocale)
    if (fromShare) saveLocale(fromShare)
    setSuggested(suggestLocale())
    setHydrated(true)
  }, [])

  const persist = useCallback((next: Goal[]) => {
    setGoals(next)
    // saveGoals never throws; a false result means the write was rejected
    // (quota/private mode) so we warn the user their changes won't survive.
    setStorageError(!saveGoals(next))
  }, [])

  const handleAdd = useCallback(
    (goal: Goal) => persist([...goals, goal]),
    [goals, persist]
  )

  const handleUpdate = useCallback(
    (goal: Goal) => persist(goals.map(g => (g.id === goal.id ? goal : g))),
    [goals, persist]
  )

  const handleDelete = useCallback(
    (id: string) => {
      persist(goals.filter(g => g.id !== id))
      setSelectedId(null)
    },
    [goals, persist]
  )

  const handleClear = useCallback(() => {
    clearGoalsStorage()
    setGoals([])
    setSelectedId(null)
    setClearSignal(n => n + 1)
  }, [])

  // Merge imported goals by id: existing ids are overwritten, new ones appended,
  // which keeps re-importing the same file idempotent.
  const handleImport = useCallback(
    (imported: Goal[]) => {
      const byId = new Map(goals.map(g => [g.id, g]))
      imported.forEach(g => byId.set(g.id, g))
      persist([...byId.values()])
    },
    [goals, persist]
  )

  const handleLocale = useCallback((next: PlannerLocale) => {
    setLocaleState(next)
    saveLocale(next)
  }, [])

  if (!hydrated) return null

  if (!locale) {
    return <RegionPicker suggested={suggested} onConfirm={handleLocale} />
  }

  const selected = goals.find(g => g.id === selectedId) ?? null

  return (
    <LocaleProvider locale={locale} onChange={handleLocale}>
      {selected ? (
        <GoalDetail
          key={selected.id}
          goal={selected}
          onUpdate={handleUpdate}
          onDelete={() => handleDelete(selected.id)}
          onBack={() => setSelectedId(null)}
        />
      ) : (
        <Dashboard
          goals={goals}
          storageError={storageError}
          onAdd={handleAdd}
          onOpen={setSelectedId}
          onDelete={handleDelete}
          onClear={handleClear}
          onImport={handleImport}
        />
      )}
      <ChatWidget goals={goals} clearSignal={clearSignal} />
    </LocaleProvider>
  )
}
