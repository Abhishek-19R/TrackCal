import { apiFetch } from './client.ts'
import type {
  FoodCreate,
  FoodResponse,
  FoodSearchResponse,
  FoodUpdate,
} from '../types/food.ts'

export interface FoodSearchParams {
  q?: string
  page?: number
  limit?: number
}

export const foodApi = {
  async search(params: FoodSearchParams = {}): Promise<FoodSearchResponse> {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.limit !== undefined) query.set('limit', String(params.limit))

    const qs = query.toString()
    return apiFetch<FoodSearchResponse>(`/foods/search${qs ? `?${qs}` : ''}`)
  },

  async getById(id: string): Promise<FoodResponse> {
    return apiFetch<FoodResponse>(`/foods/${id}`)
  },

  async create(data: FoodCreate): Promise<FoodResponse> {
    return apiFetch<FoodResponse>('/foods', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: FoodUpdate): Promise<FoodResponse> {
    return apiFetch<FoodResponse>(`/foods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async delete(id: string): Promise<void> {
    return apiFetch<void>(`/foods/${id}`, {
      method: 'DELETE',
    })
  },
}
