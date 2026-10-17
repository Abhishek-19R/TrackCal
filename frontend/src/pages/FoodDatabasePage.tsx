import React, { useEffect, useState, useCallback } from 'react'
import {
  Database,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
} from 'lucide-react'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { LoadingSpinner } from '../components/ui/LoadingSpinner.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { foodApi } from '../api/foods.ts'
import { useApp } from '../context/AppContext.tsx'
import type { FoodCreate, FoodResponse, FoodSourceType } from '../types/food.ts'

export const FoodDatabasePage: React.FC = () => {
  const { addToast, devUserId } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSource, setFilterSource] = useState<FoodSourceType | 'all'>('all')
  const [foods, setFoods] = useState<FoodResponse[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Custom Food Form State
  const [customName, setCustomName] = useState('')
  const [customBrand, setCustomBrand] = useState('')
  const [customCalories, setCustomCalories] = useState('')
  const [customProtein, setCustomProtein] = useState('')
  const [customCarbs, setCustomCarbs] = useState('')
  const [customFat, setCustomFat] = useState('')
  const [customFiber, setCustomFiber] = useState('')
  const [customServingDesc, setCustomServingDesc] = useState('1 serving')
  const [customServingWeight, setCustomServingWeight] = useState('100')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchFoods = useCallback(async (query: string) => {
    setIsSearching(true)
    try {
      const res = await foodApi.search({ q: query.trim() || undefined, limit: 50 })
      setFoods(res.items)
      setTotalCount(res.total)
    } catch {
      setFoods([])
      setTotalCount(0)
    } finally {
      setIsSearching(false)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchFoods(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchFoods, searchQuery, devUserId])

  const handleDeleteFood = async (food: FoodResponse) => {
    if (!window.confirm(`Are you sure you want to delete "${food.name}"?`)) return
    try {
      await foodApi.delete(food.id)
      addToast(`Deleted custom food: ${food.name}`, 'info')
      void fetchFoods(searchQuery)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete food'
      addToast(msg, 'error')
    }
  }

  const handleCreateCustomFood = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const cals = parseFloat(customCalories)
    const prot = parseFloat(customProtein)
    const carb = parseFloat(customCarbs)
    const fat = parseFloat(customFat)
    const fib = parseFloat(customFiber) || 0
    const srvWeight = parseFloat(customServingWeight)

    if (!customName.trim()) {
      setFormError('Food name is required')
      return
    }
    if (isNaN(cals) || cals < 0) {
      setFormError('Calories per 100g must be a non-negative number')
      return
    }
    if (isNaN(prot) || isNaN(carb) || isNaN(fat)) {
      setFormError('Protein, carbs, and fat values are required')
      return
    }
    if (isNaN(srvWeight) || srvWeight <= 0) {
      setFormError('Serving weight in grams must be greater than 0')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: FoodCreate = {
        name: customName.trim(),
        brand: customBrand.trim() || undefined,
        serving_sizes: [
          {
            description: customServingDesc.trim() || '1 serving',
            weight_g: srvWeight,
            is_default: true,
          },
        ],
        nutrients_per_100g: {
          calories: cals,
          protein_g: prot,
          carbs_g: carb,
          fat_g: fat,
          fiber_g: fib,
        },
        tags: ['custom', 'user-created'],
      }

      await foodApi.create(payload)
      addToast(`Created custom food: ${customName.trim()}`, 'success')
      setIsCreateModalOpen(false)
      // Reset form
      setCustomName('')
      setCustomBrand('')
      setCustomCalories('')
      setCustomProtein('')
      setCustomCarbs('')
      setCustomFat('')
      setCustomFiber('')
      void fetchFoods(searchQuery)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create food'
      setFormError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter foods by source type
  const displayedFoods = foods.filter((f) => {
    if (filterSource === 'all') return true
    return f.provenance?.source_type === filterSource
  })

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Food Catalog</h2>
          <p className="text-xs text-slate-500">
            Curated system staples, verified database, and user-created custom foods
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Custom Food
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <Input
          placeholder="Search by food name, brand, or tag (e.g. Oats, Egg, Chicken, Banana)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          rightIcon={isSearching ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : undefined}
        />

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium mr-1">Source:</span>
            {(
              [
                { id: 'all', label: 'All Catalog' },
                { id: 'system', label: 'Curated Staples' },
                { id: 'user', label: 'Custom Foods' },
                { id: 'cached', label: 'Cached External' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterSource(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filterSource === tab.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-slate-400 font-medium">
            Showing {displayedFoods.length} of {totalCount} total items
          </span>
        </div>
      </div>

      {/* Foods Grid */}
      {isLoading ? (
        <LoadingSpinner text="Loading food catalog..." className="py-20" />
      ) : displayedFoods.length === 0 ? (
        <EmptyState
          icon={<Database className="w-6 h-6" />}
          title="No food items found"
          description={
            searchQuery
              ? `No catalog entries matched "${searchQuery}". Try a simpler term or add a custom food.`
              : 'The food catalog is currently empty.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Custom Food
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedFoods.map((food) => {
            const isUserCreated = food.provenance?.source_type === 'user'
            const defaultServing =
              food.serving_sizes.find((s) => s.is_default) || food.serving_sizes[0]

            return (
              <Card key={food.id} className="p-5 flex flex-col justify-between hoverEffect">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 leading-snug">
                        {food.name}
                      </h4>
                      {food.brand && (
                        <p className="text-xs text-slate-500 font-medium">{food.brand}</p>
                      )}
                    </div>
                    <Badge
                      variant={isUserCreated ? 'purple' : 'emerald'}
                      size="sm"
                      dot
                    >
                      {isUserCreated ? 'Custom' : 'System'}
                    </Badge>
                  </div>

                  {/* Nutrients per 100g */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Calories</p>
                      <p className="font-bold text-slate-800">
                        {Math.round(food.nutrients_per_100g.calories)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-sky-600">Protein</p>
                      <p className="font-bold text-slate-800">{food.nutrients_per_100g.protein_g}g</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-amber-600">Carbs</p>
                      <p className="font-bold text-slate-800">{food.nutrients_per_100g.carbs_g}g</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-rose-600">Fat</p>
                      <p className="font-bold text-slate-800">{food.nutrients_per_100g.fat_g}g</p>
                    </div>
                  </div>

                  {/* Serving size note */}
                  <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
                    <span>
                      Basis:{' '}
                      <strong className="text-slate-700">
                        {defaultServing ? defaultServing.description : '100g'} (
                        {defaultServing ? defaultServing.weight_g : 100}g)
                      </strong>
                    </span>
                    {food.nutrients_per_100g.fiber_g ? (
                      <span className="text-emerald-700 font-medium">
                        Fiber: {food.nutrients_per_100g.fiber_g}g
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Card Footer Actions & Tags */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{food.tags.slice(0, 2).join(', ') || 'staple'}</span>
                  </div>

                  {isUserCreated && (
                    <button
                      onClick={() => handleDeleteFood(food)}
                      title="Delete custom food"
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal: Create Custom Food */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Custom Food Item"
        description="Add a personalized food or recipe to your isolated library."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomFood} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Food Name"
              placeholder="e.g. Homemade Protein Pancake"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              required
            />
            <Input
              label="Brand / Creator (Optional)"
              placeholder="e.g. My Kitchen, Local Bakery"
              value={customBrand}
              onChange={(e) => setCustomBrand(e.target.value)}
            />
          </div>

          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nutritional Content (Per 100g Basis)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Input
                type="number"
                step="0.1"
                min="0"
                label="Calories (kcal)"
                placeholder="250"
                value={customCalories}
                onChange={(e) => setCustomCalories(e.target.value)}
                required
              />
              <Input
                type="number"
                step="0.1"
                min="0"
                label="Protein (g)"
                placeholder="20"
                value={customProtein}
                onChange={(e) => setCustomProtein(e.target.value)}
                required
              />
              <Input
                type="number"
                step="0.1"
                min="0"
                label="Carbs (g)"
                placeholder="30"
                value={customCarbs}
                onChange={(e) => setCustomCarbs(e.target.value)}
                required
              />
              <Input
                type="number"
                step="0.1"
                min="0"
                label="Fat (g)"
                placeholder="5"
                value={customFat}
                onChange={(e) => setCustomFat(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              type="number"
              step="0.1"
              min="0"
              label="Dietary Fiber (g)"
              placeholder="3"
              value={customFiber}
              onChange={(e) => setCustomFiber(e.target.value)}
            />
            <Input
              label="Default Serving Name"
              placeholder="e.g. 1 pancake"
              value={customServingDesc}
              onChange={(e) => setCustomServingDesc(e.target.value)}
              required
            />
            <Input
              type="number"
              step="1"
              min="1"
              label="Serving Weight (g)"
              placeholder="120"
              value={customServingWeight}
              onChange={(e) => setCustomServingWeight(e.target.value)}
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save to Catalog
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
