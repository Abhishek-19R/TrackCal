import React, { useEffect, useState, useCallback } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Plus,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { LoadingSpinner } from '../components/ui/LoadingSpinner.tsx'
import { QuickLogFoodModal } from '../components/modals/QuickLogFoodModal.tsx'
import { mealApi } from '../api/meals.ts'
import { useApp } from '../context/AppContext.tsx'
import type { DailyMealsSummaryResponse } from '../types/meal.ts'
import type { MealType } from '../types/meal.ts'

export const FoodLogPage: React.FC = () => {
  const { addToast } = useApp()
  const todayStr = new Date().toISOString().split('T')[0]

  const [currentDate, setCurrentDate] = useState<string>(todayStr)
  const [dailyData, setDailyData] = useState<DailyMealsSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [logModal, setLogModal] = useState<{ open: boolean; mealType: MealType }>({
    open: false,
    mealType: 'breakfast',
  })

  const fetchDayMeals = useCallback(async (date: string) => {
    setIsLoading(true)
    try {
      const res = await mealApi.getDayMeals(date)
      setDailyData(res)
    } catch {
      setDailyData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchDayMeals(currentDate)

    const handleRefresh = () => void fetchDayMeals(currentDate)
    window.addEventListener('nutritrack:data-refresh', handleRefresh)
    window.addEventListener('nutritrack:user-changed', handleRefresh)
    return () => {
      window.removeEventListener('nutritrack:data-refresh', handleRefresh)
      window.removeEventListener('nutritrack:user-changed', handleRefresh)
    }
  }, [fetchDayMeals, currentDate])

  const handleDateShift = (offsetDays: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + offsetDays)
    setCurrentDate(d.toISOString().split('T')[0])
  }

  const handleDeleteItem = async (logItemId: string) => {
    try {
      await mealApi.deleteItem(logItemId)
      addToast('Food item removed', 'info')
      void fetchDayMeals(currentDate)
    } catch {
      addToast('Failed to delete item', 'error')
    }
  }

  const mealBuckets: { key: MealType; label: string; icon: string }[] = [
    { key: 'breakfast', label: 'Breakfast', icon: '🍳' },
    { key: 'lunch', label: 'Lunch', icon: '🥗' },
    { key: 'dinner', label: 'Dinner', icon: '🍲' },
    { key: 'snack', label: 'Snacks & Extras', icon: '🍎' },
  ]

  const totals = dailyData?.daily_totals || {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
  }

  return (
    <div className="space-y-6">
      {/* Date Switcher & Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateShift(-1)}
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl">
            <CalendarIcon className="w-4 h-4 text-emerald-600" />
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateShift(1)}
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {currentDate !== todayStr && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentDate(todayStr)}
            >
              Today
            </Button>
          )}
        </div>

        {/* Daily Summary Pill */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
            <Flame className="w-4 h-4 text-emerald-600" />
            <span>{Math.round(totals.calories)} kcal Total</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-slate-600 font-medium">
            <span>P: <strong className="text-slate-900">{Math.round(totals.protein_g)}g</strong></span>
            <span>C: <strong className="text-slate-900">{Math.round(totals.carbs_g)}g</strong></span>
            <span>F: <strong className="text-slate-900">{Math.round(totals.fat_g)}g</strong></span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text={`Loading meal log for ${currentDate}...`} className="py-20" />
      ) : (
        <div className="space-y-5">
          {mealBuckets.map((bucket) => {
            const meal = dailyData?.meals.find((m) => m.meal_type === bucket.key)
            const items = meal?.items || []
            const mealTotals = meal?.total_nutrients || {
              calories: 0,
              protein_g: 0,
              carbs_g: 0,
              fat_g: 0,
              fiber_g: 0,
            }

            return (
              <Card key={bucket.key} className="overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 flex flex-row items-center justify-between py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{bucket.icon}</span>
                    <div>
                      <CardTitle className="text-base">{bucket.label}</CardTitle>
                      <p className="text-xs text-slate-500 font-medium">
                        {Math.round(mealTotals.calories)} kcal &bull; P: {mealTotals.protein_g}g &bull; C:{' '}
                        {mealTotals.carbs_g}g &bull; F: {mealTotals.fat_g}g
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setLogModal({ open: true, mealType: bucket.key })}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Food
                  </Button>
                </CardHeader>

                <CardContent className="p-0">
                  {items.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No foods logged for {bucket.label.toLowerCase()} on this date.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <div
                          key={item.log_item_id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors group"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.food_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.number_of_servings} &times; {item.serving_selected.description}{' '}
                              ({Math.round(item.total_weight_g)}g)
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {Math.round(item.computed_nutrients.calories)} kcal
                              </span>
                              <div className="hidden sm:flex items-center gap-2 text-slate-500 text-[11px]">
                                <Badge variant="blue" size="sm">
                                  P: {item.computed_nutrients.protein_g}g
                                </Badge>
                                <Badge variant="amber" size="sm">
                                  C: {item.computed_nutrients.carbs_g}g
                                </Badge>
                                <Badge variant="rose" size="sm">
                                  F: {item.computed_nutrients.fat_g}g
                                </Badge>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteItem(item.log_item_id)}
                              title="Delete food entry"
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal for adding food */}
      <QuickLogFoodModal
        isOpen={logModal.open}
        onClose={() => setLogModal((prev) => ({ ...prev, open: false }))}
        initialMealType={logModal.mealType}
        initialDate={currentDate}
        onSuccess={() => void fetchDayMeals(currentDate)}
      />
    </div>
  )
}
