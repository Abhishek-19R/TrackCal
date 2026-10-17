import React, { useEffect, useState, useCallback } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Input } from '../components/ui/Input.tsx'
import { StatCard } from '../components/ui/StatCard.tsx'
import { LoadingSpinner } from '../components/ui/LoadingSpinner.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { weightApi } from '../api/weights.ts'
import { useApp } from '../context/AppContext.tsx'
import type { WeightLogResponse, WeightUnit } from '../types/weight.ts'

export const WeightTrackerPage: React.FC = () => {
  const { addToast, devUserId } = useApp()
  const todayStr = new Date().toISOString().split('T')[0]

  const [weights, setWeights] = useState<WeightLogResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Quick Log form state
  const [logDate, setLogDate] = useState(todayStr)
  const [weightValue, setWeightValue] = useState('')
  const [unit, setUnit] = useState<WeightUnit>('kg')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchWeights = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await weightApi.list()
      setWeights(res)
    } catch {
      setWeights([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchWeights()

    const handleRefresh = () => void fetchWeights()
    window.addEventListener('nutritrack:data-refresh', handleRefresh)
    window.addEventListener('nutritrack:user-changed', handleRefresh)
    return () => {
      window.removeEventListener('nutritrack:data-refresh', handleRefresh)
      window.removeEventListener('nutritrack:user-changed', handleRefresh)
    }
  }, [fetchWeights, devUserId])

  const handleRecordWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const num = parseFloat(weightValue)
    if (isNaN(num) || num <= 0) {
      setFormError('Please enter a valid positive weight value')
      return
    }

    setIsSubmitting(true)
    try {
      await weightApi.log({
        date: logDate,
        weight: num,
        unit,
        note: note.trim() || undefined,
      })
      addToast(`Weight saved for ${logDate}`, 'success')
      setWeightValue('')
      setNote('')
      void fetchWeights()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record weight'
      setFormError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteWeight = async (item: WeightLogResponse) => {
    if (!window.confirm(`Delete weight entry for ${item.date}?`)) return
    try {
      await weightApi.delete(item.id)
      addToast(`Deleted weight for ${item.date}`, 'info')
      void fetchWeights()
    } catch {
      addToast('Failed to delete weight', 'error')
    }
  }

  // Calculate statistics
  const latestWeight = weights.length > 0 ? weights[0] : null
  const previousWeight = weights.length > 1 ? weights[1] : null
  const weightDiff =
    latestWeight && previousWeight
      ? Math.round((latestWeight.weight_kg - previousWeight.weight_kg) * 10) / 10
      : null

  const allKg = weights.map((w) => w.weight_kg)
  const lowestKg = allKg.length > 0 ? Math.min(...allKg) : null
  const highestKg = allKg.length > 0 ? Math.max(...allKg) : null
  const averageKg =
    allKg.length > 0 ? Math.round((allKg.reduce((a, b) => a + b, 0) / allKg.length) * 10) / 10 : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Body Weight Tracker</h2>
        <p className="text-xs text-slate-500">
          Daily fasted morning weigh-ins, trends, and chronological log history
        </p>
      </div>

      {/* Quick Entry Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span>Record Weigh-In</span>
            <span className="text-xs font-normal text-slate-400">
              Same-date weigh-ins update seamlessly
            </span>
          </CardTitle>
          <CardDescription>
            Enter your scale reading. We normalize and store all values in kilograms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRecordWeight} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                type="date"
                label="Date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Weight & Unit
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="20"
                    max="1100"
                    placeholder={unit === 'kg' ? 'e.g. 75.4' : 'e.g. 166.2'}
                    value={weightValue}
                    onChange={(e) => setWeightValue(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setUnit('kg')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        unit === 'kg'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnit('lbs')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        unit === 'lbs'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      lbs
                    </button>
                  </div>
                </div>
              </div>

              <Input
                label="Note (Optional)"
                placeholder="e.g. Post-cardio, fasted"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Plus className="w-4 h-4" />}>
                Record Entry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Weight"
          value={latestWeight ? `${latestWeight.weight_kg} kg` : '—'}
          unit={latestWeight ? `(${Math.round(latestWeight.weight_kg * 2.20462)} lbs)` : ''}
          subtitle={
            weightDiff !== null ? (
              <span className={`inline-flex items-center gap-1 font-semibold ${weightDiff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {weightDiff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg since prior
              </span>
            ) : (
              'Initial baseline'
            )
          }
          color="emerald"
          icon={<Scale className="w-6 h-6" />}
        />

        <StatCard
          label="Period Average"
          value={averageKg !== null ? `${averageKg} kg` : '—'}
          unit={averageKg !== null ? `(${Math.round(averageKg * 2.20462)} lbs)` : ''}
          subtitle={`Across ${weights.length} entries`}
          color="blue"
          icon={<Minus className="w-6 h-6" />}
        />

        <StatCard
          label="Period Lowest"
          value={lowestKg !== null ? `${lowestKg} kg` : '—'}
          subtitle="All-time minimum recorded"
          color="emerald"
          icon={<ChevronDown className="w-6 h-6" />}
        />

        <StatCard
          label="Period Highest"
          value={highestKg !== null ? `${highestKg} kg` : '—'}
          subtitle="All-time maximum recorded"
          color="amber"
          icon={<ChevronUp className="w-6 h-6" />}
        />
      </div>

      {/* Weight History Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span>Weight History</span>
            <span className="text-xs font-semibold text-slate-500">
              {weights.length} entries recorded
            </span>
          </CardTitle>
          <CardDescription>Chronological log of registered weigh-ins</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Loading weigh-ins..." className="py-12" />
          ) : weights.length === 0 ? (
            <EmptyState
              icon={<Scale className="w-6 h-6" />}
              title="No weight entries recorded"
              description="Record your morning weigh-in above to begin tracking weight trajectories."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200/80">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Weight (kg)</th>
                    <th className="px-6 py-3.5">Weight (lbs)</th>
                    <th className="px-6 py-3.5">Note</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weights.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {w.date}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-900 text-sm">
                        {w.weight_kg} kg
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-500">
                        {Math.round(w.weight_kg * 2.20462 * 10) / 10} lbs
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 italic max-w-xs truncate">
                        {w.note || '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteWeight(w)}
                          title="Delete weight entry"
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
