import React, { useState, useEffect } from 'react'
import { Check, Flame, Loader2, Search } from 'lucide-react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import { Input } from '../ui/Input.tsx'
import { Select } from '../ui/Select.tsx'
import { foodApi } from '../../api/foods.ts'
import { mealApi } from '../../api/meals.ts'
import { useApp } from '../../context/AppContext.tsx'
import type { FoodResponse, ServingSize } from '../../types/food.ts'
import type { MealType } from '../../types/meal.ts'

export interface QuickLogFoodModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialMealType?: MealType
  initialDate?: string
}

export const QuickLogFoodModal: React.FC<QuickLogFoodModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMealType = 'breakfast',
  initialDate,
}) => {
  const { addToast } = useApp()
  const todayStr = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(initialDate || todayStr)
  const [mealType, setMealType] = useState<MealType>(initialMealType)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FoodResponse[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodResponse | null>(null)
  const [selectedServing, setSelectedServing] = useState<ServingSize | null>(null)
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(1)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialDate) setDate(initialDate)
    if (initialMealType) setMealType(initialMealType)
  }, [initialDate, initialMealType])

  // Food Search debounce
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await foodApi.search({ q: searchQuery.trim() || undefined, limit: 15 })
        setSearchResults(res.items)
      } catch {
        // Fallback or ignore
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery, isOpen])

  // When a food is selected, default to its first or default serving size
  const handleSelectFood = (food: FoodResponse) => {
    setSelectedFood(food)
    const defaultServing =
      food.serving_sizes.find((s) => s.is_default) ||
      food.serving_sizes[0] || {
        description: '100g standard portion',
        weight_g: 100,
      }
    setSelectedServing(defaultServing)
    setServingsMultiplier(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFood || !selectedServing) {
      setError('Please select a food item to log')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await mealApi.logMeal({
        date,
        meal_type: mealType,
        food_id: selectedFood.id,
        serving_id: selectedServing.serving_id,
        serving_selected: {
          description: selectedServing.description,
          weight_g: selectedServing.weight_g,
        },
        number_of_servings: servingsMultiplier,
        notes: notes.trim() || undefined,
      })
      addToast(`Logged ${selectedFood.name} to ${mealType}`, 'success')
      setSelectedFood(null)
      setSelectedServing(null)
      setSearchQuery('')
      setNotes('')
      onClose()
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to log food'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate estimated nutrients for preview
  const estimatedCalories =
    selectedFood && selectedServing
      ? Math.round(
          ((selectedFood.nutrients_per_100g.calories * selectedServing.weight_g) / 100) *
            servingsMultiplier
        )
      : 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Food to Meal"
      description="Search the verified catalog or your custom foods to record nutrition."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Select
            label="Meal Category"
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            options={[
              { value: 'breakfast', label: '🍳 Breakfast' },
              { value: 'lunch', label: '🥗 Lunch' },
              { value: 'dinner', label: '🍲 Dinner' },
              { value: 'snack', label: '🍎 Snack' },
            ]}
          />
        </div>

        {/* Food Search & Selection */}
        {!selectedFood ? (
          <div>
            <Input
              label="Search Food Catalog"
              placeholder="e.g. Oatmeal, Chicken breast, Banana, Rice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              rightIcon={isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            />

            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  {isSearching ? 'Searching catalog...' : 'No foods found. Try typing a staple food name.'}
                </div>
              ) : (
                searchResults.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => handleSelectFood(food)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700">
                        {food.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {food.brand ? `${food.brand} • ` : ''}
                        {Math.round(food.nutrients_per_100g.calories)} kcal / 100g &bull; P:{' '}
                        {food.nutrients_per_100g.protein_g}g C: {food.nutrients_per_100g.carbs_g}g F:{' '}
                        {food.nutrients_per_100g.fat_g}g
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Select &rarr;
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Food Selected Details & Quantity */
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Selected Food
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-1">{selectedFood.name}</h4>
                {selectedFood.brand && (
                  <p className="text-xs text-slate-500">{selectedFood.brand}</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedFood(null)}
              >
                Change Food
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Serving Size
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  value={selectedServing?.description || ''}
                  onChange={(e) => {
                    const found = selectedFood.serving_sizes.find(
                      (s) => s.description === e.target.value
                    )
                    if (found) setSelectedServing(found)
                  }}
                >
                  {selectedFood.serving_sizes.map((s, idx) => (
                    <option key={idx} value={s.description}>
                      {s.description} ({s.weight_g}g)
                    </option>
                  ))}
                  <option value="Custom 100g">100g standard basis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Number of Servings
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.1"
                  max="50"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  value={servingsMultiplier}
                  onChange={(e) => setServingsMultiplier(parseFloat(e.target.value) || 1)}
                  required
                />
              </div>
            </div>

            {/* Nutrition Estimate Banner */}
            <div className="flex items-center justify-between text-xs bg-white rounded-xl p-3 border border-emerald-100 text-slate-700 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <Flame className="w-4 h-4 text-emerald-600" />
                ~{estimatedCalories} kcal total
              </span>
              <span>
                Total Weight:{' '}
                <strong className="text-slate-900">
                  {Math.round((selectedServing?.weight_g || 100) * servingsMultiplier)}g
                </strong>
              </span>
            </div>
          </div>
        )}

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Added half spoon of honey"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
        />

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!selectedFood}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Log to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
