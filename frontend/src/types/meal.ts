export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_TYPE_META: Record<MealType, { label: string; icon: string }> = {
  breakfast: { label: 'Breakfast', icon: '🍳' },
  lunch: { label: 'Lunch', icon: '🥗' },
  dinner: { label: 'Dinner', icon: '🍲' },
  snack: { label: 'Snacks & Extras', icon: '🍎' },
}

export const getDefaultMealType = (): MealType => {
  const hour = new Date().getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 18) return 'snack'
  return 'dinner'
}

export interface ComputedNutrients {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
}

export interface SelectedServing {
  description: string
  weight_g: number
}

export interface MealItem {
  log_item_id: string
  food_id: string
  food_name: string
  serving_selected: SelectedServing
  number_of_servings: number
  total_weight_g: number
  computed_nutrients: ComputedNutrients
  logged_at: string
}

export interface MealItemAdd {
  food_id: string
  serving_id?: string | null
  serving_selected?: SelectedServing | null
  number_of_servings?: number
}

export interface MealLogCreate {
  date: string
  meal_type: MealType
  items?: MealItemAdd[]
  food_id?: string | null
  serving_id?: string | null
  serving_selected?: SelectedServing | null
  number_of_servings?: number
  notes?: string | null
}

export interface MealItemUpdate {
  serving_id?: string | null
  serving_selected?: SelectedServing | null
  number_of_servings?: number | null
}

export interface MealLogResponse {
  id: string
  user_id: string
  date: string
  meal_type: MealType
  items: MealItem[]
  notes?: string | null
  total_nutrients: ComputedNutrients
  created_at: string
  updated_at: string
}

export interface DailyMealsSummaryResponse {
  date: string
  user_id: string
  meals: MealLogResponse[]
  daily_totals: ComputedNutrients
}
