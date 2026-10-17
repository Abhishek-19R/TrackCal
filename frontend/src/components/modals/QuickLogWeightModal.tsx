import React, { useState } from 'react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import { Input } from '../ui/Input.tsx'
import { weightApi } from '../../api/weights.ts'
import { useApp } from '../../context/AppContext.tsx'
import type { WeightUnit } from '../../types/weight.ts'

export interface QuickLogWeightModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const QuickLogWeightModal: React.FC<QuickLogWeightModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addToast } = useApp()
  const todayStr = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(todayStr)
  const [weightValue, setWeightValue] = useState('')
  const [unit, setUnit] = useState<WeightUnit>('kg')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const num = parseFloat(weightValue)
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid positive weight')
      return
    }

    setIsLoading(true)
    try {
      await weightApi.log({
        date,
        weight: num,
        unit,
        note: note.trim() || undefined,
      })
      addToast(`Recorded weight: ${num} ${unit} for ${date}`, 'success')
      setWeightValue('')
      setNote('')
      onClose()
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record weight'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Body Weight"
      description="Enter fasted morning weight. Daily entries update automatically."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        <Input
          type="date"
          label="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
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
              placeholder={unit === 'kg' ? 'e.g. 74.5' : 'e.g. 164.2'}
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              className="flex-1"
              required
            />
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setUnit('kg')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
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
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  unit === 'lbs'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                lbs
              </button>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Weight values in lbs will be automatically converted and stored as kg in the database.
          </p>
        </div>

        <Input
          label="Note (Optional)"
          placeholder="e.g. Morning, after workout, fasted"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
        />

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Weight
          </Button>
        </div>
      </form>
    </Modal>
  )
}
