import React, { useState, useEffect } from 'react'
import { Check, Flame, Loader2, Search, Sparkles } from 'lucide-react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import { Input } from '../ui/Input.tsx'
import { Select } from '../ui/Select.tsx'
import { foodApi } from '../../api/foods.ts'
import { mealApi } from '../../api/meals.ts'
import { useApp } from '../../context/AppContext.tsx'
import type { FoodResponse, ServingSize } from '../../types/food.ts'
import { type MealType, MEAL_TYPE_META, getDefaultMealType } from '../../types/meal.ts'
import { formatDateDisplay, formatRelativeDateDisplay, getTodayDateString } from '../../utils/date.ts'

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
  initialMealType,
  initialDate,
}) => {
  const { addToast } = useApp()
  const todayStr = getTodayDateString()

  // Always compute effective target date and category from props or defaults
  const targetDate = initialDate || todayStr
  const [mealType, setMealType] = useState<MealType>(initialMealType || getDefaultMealType())

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FoodResponse[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [selectedFood, setSelectedFood] = useState<FoodResponse | null>(null)
  const [selectedServing, setSelectedServing] = useState<ServingSize | null>(null)
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(1)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form and sync with props whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setMealType(initialMealType || getDefaultMealType())
      setSelectedFood(null)
      setSelectedServing(null)
      setServingsMultiplier(1)
      setSearchQuery('')
      setNotes('')
      setError(null)
      setSearchError(null)
    }
  }, [isOpen, initialMealType, initialDate])

  // Food Search debounce (immediate on open, 250ms when typing)
  useEffect(() => {
    if (!isOpen) return
    let active = true
    setIsSearching(true)
    const delay = searchQuery.trim() ? 250 : 0
    const timer = setTimeout(async () => {
      try {
        const res = await foodApi.search({ q: searchQuery.trim() || undefined, limit: 15 })
        if (active) {
          setSearchResults(res.items)
          setSearchError(null)
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to search foods'
          setSearchError(msg)
        }
      } finally {
        if (active) setIsSearching(false)
      }
    }, delay)

    return () => {
      active = false
      clearTimeout(timer)
    }
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
    const effectiveMealType = initialMealType || mealType

    try {
      await mealApi.logMeal({
        date: targetDate,
        meal_type: effectiveMealType,
        food_id: selectedFood.id,
        serving_id: selectedServing.serving_id,
        serving_selected: {
          description: selectedServing.description,
          weight_g: selectedServing.weight_g,
        },
        number_of_servings: servingsMultiplier,
        notes: notes.trim() || undefined,
      })
      const mealMeta = MEAL_TYPE_META[effectiveMealType]
      addToast(`Logged ${selectedFood.name} to ${mealMeta.label}`, 'success')
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

  // Calculate estimated nutrients for preview based on selected food and portion
  const effectiveMealMeta = MEAL_TYPE_META[initialMealType || mealType]
  const selectedWeightG = Math.round((selectedServing?.weight_g || 100) * servingsMultiplier)
  const estimatedCalories =
    selectedFood && selectedServing
      ? Math.round(
          ((selectedFood.nutrients_per_100g.calories * selectedServing.weight_g) / 100) *
            servingsMultiplier
        )
      : 0
  const estimatedProtein =
    selectedFood && selectedServing
      ? Math.round(
          (((selectedFood.nutrients_per_100g.protein_g * selectedServing.weight_g) / 100) *
            servingsMultiplier) *
            10
        ) / 10
      : 0
  const estimatedCarbs =
    selectedFood && selectedServing
      ? Math.round(
          (((selectedFood.nutrients_per_100g.carbs_g * selectedServing.weight_g) / 100) *
            servingsMultiplier) *
            10
        ) / 10
      : 0
  const estimatedFat =
    selectedFood && selectedServing
      ? Math.round(
          (((selectedFood.nutrients_per_100g.fat_g * selectedServing.weight_g) / 100) *
            servingsMultiplier) *
            10
        ) / 10
      : 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Food to Meal"
      description="Record nutrition into your daily meal log with instant macro calculations."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Read-Only Context Confirmation Pill: Inherited Category and Selected Date */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50/80 border border-emerald-200/70 rounded-xl text-xs text-emerald-950">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base leading-none">{effectiveMealMeta.icon}</span>
            <span>
              Logging to <strong className="font-bold text-emerald-900">{effectiveMealMeta.label}</strong>
            </span>
            <span className="text-emerald-400 font-bold">&bull;</span>
            <span className="font-medium text-emerald-800">
              {formatRelativeDateDisplay(targetDate)} ({formatDateDisplay(targetDate)})
            </span>
          </div>
        </div>

        {/* If category was not supplied by caller, render selector as fallback */}
        {!initialMealType && (
          <div>
            <Select
              label="Meal Category"
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              options={[
                { value: 'breakfast', label: '🍳 Breakfast' },
                { value: 'lunch', label: '🥗 Lunch' },
                { value: 'dinner', label: '🍲 Dinner' },
                { value: 'snack', label: '🍎 Snacks & Extras' },
              ]}
            />
          </div>
        )}

        {/* Food Search & Selection */}
        {!selectedFood ? (
          <div className="space-y-2">
            <Input
              label="Search Food Catalog"
              placeholder="e.g. Oatmeal, Chicken breast, Banana, Rice, Salmon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              rightIcon={isSearching ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : undefined}
              autoFocus
            />

            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white shadow-2xs">
              {isSearching && searchResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                  <span>Searching food catalog...</span>
                </div>
              ) : searchError ? (
                <div className="p-4 text-center text-xs text-rose-600 bg-rose-50/50">
                  {searchError}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  {searchQuery.trim()
                    ? `No foods found matching "${searchQuery}". Try typing a staple ingredient like "egg", "rice", or "chicken".`
                    : 'No foods available in catalog yet.'}
                </div>
              ) : (
                searchResults.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => handleSelectFood(food)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 truncate">
                          {food.name}
                        </p>
                        {food.brand && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {food.brand}
                          </span>
                        )}
                        {food.is_system && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium inline-flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {Math.round(food.nutrients_per_100g.calories)} kcal
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          P: {food.nutrients_per_100g.protein_g}g
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                          C: {food.nutrients_per_100g.carbs_g}g
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                          F: {food.nutrients_per_100g.fat_g}g
                        </span>
                        <span className="text-[10px] text-slate-400">per 100g</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Select &rarr;
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Food Selected Details & Quantity */
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  value={selectedServing?.description || ''}
                  onChange={(e) => {
                    const found = selectedFood.serving_sizes.find(
                      (s) => s.description === e.target.value
                    )
                    if (found) setSelectedServing(found)
                    else if (e.target.value === '100g standard portion') {
                      setSelectedServing({
                        description: '100g standard portion',
                        weight_g: 100,
                      })
                    }
                  }}
                >
                  {selectedFood.serving_sizes.map((s, idx) => (
                    <option key={idx} value={s.description}>
                      {s.description} ({s.weight_g}g)
                    </option>
                  ))}
                  <option value="100g standard portion">100g standard portion (100g)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Number of Servings
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setServingsMultiplier((prev) =>
                        Math.max(0.25, Math.round((prev - 0.25) * 100) / 100)
                      )
                    }
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-base flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    aria-label="Decrease servings"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.25"
                    min="0.1"
                    max="50"
                    className="flex-1 text-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                    value={servingsMultiplier}
                    onChange={(e) => setServingsMultiplier(parseFloat(e.target.value) || 1)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setServingsMultiplier((prev) => Math.round((prev + 0.25) * 100) / 100)
                    }
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-base flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    aria-label="Increase servings"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Nutrition Estimate Banner */}
            <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <Flame className="w-4 h-4 text-emerald-600" />
                  ~{estimatedCalories} kcal total
                </span>
                <span className="text-slate-600 font-medium">
                  Total Weight: <strong className="text-slate-900">{selectedWeightG}g</strong>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-blue-50/60 border border-blue-100/80 rounded-lg p-1.5">
                  <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Protein</div>
                  <div className="text-sm font-bold text-blue-900">{estimatedProtein}g</div>
                </div>
                <div className="bg-amber-50/60 border border-amber-100/80 rounded-lg p-1.5">
                  <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Carbs</div>
                  <div className="text-sm font-bold text-amber-900">{estimatedCarbs}g</div>
                </div>
                <div className="bg-purple-50/60 border border-purple-100/80 rounded-lg p-1.5">
                  <div className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Fat</div>
                  <div className="text-sm font-bold text-purple-900">{estimatedFat}g</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Added half spoon of honey, organic, cooked with olive oil..."
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
            Log to {effectiveMealMeta.label}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
