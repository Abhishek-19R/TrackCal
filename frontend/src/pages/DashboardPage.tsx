import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Flame,
  Plus,
  Scale,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { StatCard } from '../components/ui/StatCard.tsx'
import { MacroProgressBar } from '../components/ui/MacroProgressBar.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { LoadingSpinner } from '../components/ui/LoadingSpinner.tsx'
import { QuickLogFoodModal } from '../components/modals/QuickLogFoodModal.tsx'
import { QuickLogWeightModal } from '../components/modals/QuickLogWeightModal.tsx'
import { mealApi } from '../api/meals.ts'
import { weightApi } from '../api/weights.ts'
import { useApp } from '../context/AppContext.tsx'
import type { DailyMealsSummaryResponse } from '../types/meal.ts'
import type { WeightLogResponse } from '../types/weight.ts'
import type { MealType } from '../types/meal.ts'

export const DashboardPage: React.FC = () => {
  const { targets, devUserId, addToast } = useApp()
  const todayStr = new Date().toISOString().split('T')[0]

  const [dailyData, setDailyData] = useState<DailyMealsSummaryResponse | null>(null)
  const [latestWeight, setLatestWeight] = useState<WeightLogResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [logFoodModal, setLogFoodModal] = useState<{ open: boolean; mealType: MealType }>({
    open: false,
    mealType: 'breakfast',
  })
  const [logWeightModalOpen, setLogWeightModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [mealsRes, weightsRes] = await Promise.all([
        mealApi.getDayMeals(todayStr).catch(() => null),
        weightApi.list().catch(() => []),
      ])

      setDailyData(mealsRes)
      if (weightsRes && weightsRes.length > 0) {
        setLatestWeight(weightsRes[0])
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false)
    }
  }, [todayStr])

  useEffect(() => {
    void fetchData()

    const handleRefresh = () => void fetchData()
    window.addEventListener('nutritrack:data-refresh', handleRefresh)
    window.addEventListener('nutritrack:user-changed', handleRefresh)
    return () => {
      window.removeEventListener('nutritrack:data-refresh', handleRefresh)
      window.removeEventListener('nutritrack:user-changed', handleRefresh)
    }
  }, [fetchData, devUserId])

  const handleDeleteItem = async (logItemId: string) => {
    try {
      await mealApi.deleteItem(logItemId)
      addToast('Item removed from meal', 'info')
      void fetchData()
    } catch {
      addToast('Failed to remove item', 'error')
    }
  }

  const totals = dailyData?.daily_totals || {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
  }

  const remainingCalories = Math.max(0, targets.calories - totals.calories)
  const caloriePercentage = Math.min(
    Math.round((totals.calories / (targets.calories || 2000)) * 100),
    100
  )

  const totalLoggedItems =
    dailyData?.meals.reduce((acc, meal) => acc + meal.items.length, 0) || 0

  const mealCategories: { key: MealType; label: string; icon: string }[] = [
    { key: 'breakfast', label: 'Breakfast', icon: '🍳' },
    { key: 'lunch', label: 'Lunch', icon: '🥗' },
    { key: 'dinner', label: 'Dinner', icon: '🍲' },
    { key: 'snack', label: 'Snacks', icon: '🍎' },
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-md shadow-emerald-950/10">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 bg-emerald-700/60 px-2.5 py-1 rounded-lg">
            Today's Trajectory
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2 text-white">
            Daily Nutrition Summary
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
            Real-time nutrition balance, macro progress, and body weight logs for user{' '}
            <span className="font-mono bg-emerald-800/60 px-1.5 py-0.5 rounded text-white font-semibold">
              {devUserId.substring(0, 8)}...
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Button
            variant="secondary"
            size="md"
            className="bg-white text-emerald-900 hover:bg-emerald-50 shadow-sm"
            onClick={() => setLogFoodModal({ open: true, mealType: 'breakfast' })}
            leftIcon={<Plus className="w-4 h-4 text-emerald-600" />}
          >
            Log Meal
          </Button>
          <Button
            variant="outline"
            size="md"
            className="border-emerald-400/50 text-white hover:bg-emerald-700/50"
            onClick={() => setLogWeightModalOpen(true)}
            leftIcon={<Scale className="w-4 h-4" />}
          >
            Log Weight
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading daily dashboard metrics..." className="py-16" />
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Calories Consumed"
              value={Math.round(totals.calories)}
              unit={`/ ${targets.calories} kcal`}
              subtitle={`${remainingCalories} kcal remaining`}
              color="emerald"
              icon={<Flame className="w-6 h-6" />}
            />

            <StatCard
              label="Protein"
              value={`${Math.round(totals.protein_g)}g`}
              unit={`/ ${targets.protein_g}g`}
              subtitle={`${Math.max(0, targets.protein_g - totals.protein_g).toFixed(0)}g to goal`}
              color="blue"
              icon={<Activity className="w-6 h-6" />}
            />

            <StatCard
              label="Latest Weight"
              value={latestWeight ? `${latestWeight.weight_kg} kg` : '—'}
              unit={latestWeight ? `(${Math.round(latestWeight.weight_kg * 2.20462)} lbs)` : ''}
              subtitle={latestWeight ? `Recorded on ${latestWeight.date}` : 'No entries yet'}
              color="amber"
              icon={<Scale className="w-6 h-6" />}
            />

            <StatCard
              label="Logged Foods"
              value={totalLoggedItems}
              unit="items today"
              subtitle={`${dailyData?.meals.length || 0} active meal buckets`}
              color="rose"
              icon={<UtensilsCrossed className="w-6 h-6" />}
            />
          </div>

          {/* Macro Budget & Calories Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calorie Ring / Budget Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>
                  <span>Calorie Target</span>
                  <Badge variant="emerald" dot>
                    {caloriePercentage}%
                  </Badge>
                </CardTitle>
                <CardDescription>Daily energy balance based on target goal</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-4">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* SVG Progress Circle */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="text-slate-100"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="text-emerald-500 transition-all duration-700 ease-out"
                      strokeWidth="10"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * caloriePercentage) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center text-center">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {Math.round(totals.calories)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      kcal eaten
                    </span>
                  </div>
                </div>

                <div className="mt-4 w-full grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-100">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Target</p>
                    <p className="text-sm font-bold text-slate-800">{targets.calories} kcal</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/60">
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase">Left</p>
                    <p className="text-sm font-bold text-emerald-800">{remainingCalories} kcal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Macro Breakdown Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  <span>Macronutrient Breakdown</span>
                  <Link
                    to="/log"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    View Food Log <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </CardTitle>
                <CardDescription>Daily intake compared to nutritional budget</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                <MacroProgressBar
                  label="Protein (Growth & Satiety)"
                  current={totals.protein_g}
                  target={targets.protein_g}
                  color="blue"
                />

                <MacroProgressBar
                  label="Carbohydrates (Energy & Performance)"
                  current={totals.carbs_g}
                  target={targets.carbs_g}
                  color="amber"
                />

                <MacroProgressBar
                  label="Dietary Fats (Hormonal Balance)"
                  current={totals.fat_g}
                  target={targets.fat_g}
                  color="rose"
                />

                <div className="pt-2">
                  <MacroProgressBar
                    label="Dietary Fiber (Digestion & Health)"
                    current={totals.fiber_g || 0}
                    target={35}
                    color="emerald"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Meals Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Today's Meals</h3>
                <p className="text-xs text-slate-500">
                  Foods logged across breakfast, lunch, dinner, and snacks
                </p>
              </div>
              <Link to="/log">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Detailed Meal Log
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mealCategories.map((cat) => {
                const mealData = dailyData?.meals.find((m) => m.meal_type === cat.key)
                const items = mealData?.items || []
                const mealCals = mealData ? Math.round(mealData.total_nutrients.calories) : 0

                return (
                  <Card key={cat.key} className="flex flex-col justify-between">
                    <div>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cat.icon}</span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{cat.label}</h4>
                            <span className="text-xs text-slate-400 font-medium">
                              {mealCals > 0 ? `${mealCals} kcal` : 'No foods logged'}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogFoodModal({ open: true, mealType: cat.key })}
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                        >
                          Add
                        </Button>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {items.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400 border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                            No foods logged yet for {cat.label.toLowerCase()}
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {items.map((item) => (
                              <div
                                key={item.log_item_id}
                                className="py-2.5 flex items-center justify-between text-xs group"
                              >
                                <div>
                                  <p className="font-semibold text-slate-800">{item.food_name}</p>
                                  <p className="text-slate-400 text-[11px]">
                                    {item.number_of_servings} &times;{' '}
                                    {item.serving_selected.description} ({Math.round(item.total_weight_g)}g)
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-bold text-slate-900">
                                      {Math.round(item.computed_nutrients.calories)} kcal
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      P: {item.computed_nutrients.protein_g}g &bull; C:{' '}
                                      {item.computed_nutrients.carbs_g}g
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteItem(item.log_item_id)}
                                    title="Remove item"
                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 transition-all p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </div>

                    {mealData && mealData.notes && (
                      <div className="px-5 pb-4 text-[11px] text-slate-500 italic border-t border-slate-50 pt-2">
                        Note: {mealData.notes}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Modals for Quick Actions */}
      <QuickLogFoodModal
        isOpen={logFoodModal.open}
        onClose={() => setLogFoodModal((prev) => ({ ...prev, open: false }))}
        initialMealType={logFoodModal.mealType}
        initialDate={todayStr}
        onSuccess={() => void fetchData()}
      />

      <QuickLogWeightModal
        isOpen={logWeightModalOpen}
        onClose={() => setLogWeightModalOpen(false)}
        onSuccess={() => void fetchData()}
      />
    </div>
  )
}
