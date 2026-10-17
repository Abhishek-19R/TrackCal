import { apiFetch } from './client.ts'
import type {
  DailyMealsSummaryResponse,
  MealItemUpdate,
  MealLogCreate,
  MealLogResponse,
} from '../types/meal.ts'

export const mealApi = {
  async getDayMeals(date: string): Promise<DailyMealsSummaryResponse> {
    return apiFetch<DailyMealsSummaryResponse>(`/meals/day/${date}`)
  },

  async logMeal(data: MealLogCreate): Promise<MealLogResponse> {
    return apiFetch<MealLogResponse>('/meals/log', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateItem(logItemId: string, data: MealItemUpdate): Promise<MealLogResponse> {
    return apiFetch<MealLogResponse>(`/meals/items/${logItemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteItem(logItemId: string): Promise<void> {
    return apiFetch<void>(`/meals/items/${logItemId}`, {
      method: 'DELETE',
    })
  },
}
