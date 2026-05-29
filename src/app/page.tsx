'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dashboard } from '~/components/planner/Dashboard'
import { GoalDetail } from '~/components/planner/GoalDetail'
import { clearGoalsStorage, Goal, loadGoals, saveGoals } from '~/lib/goals'

export default function FinancialPlanner() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGoals(loadGoals())
    setHydrated(true)
  }, [])

  const persist = useCallback((next: Goal[]) => {
    setGoals(next)
    saveGoals(next)
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

  if (!hydrated) return null

  const selected = goals.find(g => g.id === selectedId) ?? null

  if (selected) {
    return (
      <GoalDetail
        key={selected.id}
        goal={selected}
        onUpdate={handleUpdate}
        onDelete={() => handleDelete(selected.id)}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <Dashboard
      goals={goals}
      onAdd={handleAdd}
      onOpen={setSelectedId}
      onDelete={handleDelete}
      onClear={handleClear}
      onImport={handleImport}
    />
  )
}
