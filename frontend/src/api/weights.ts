import { apiFetch } from './client.ts'
import type {
  WeightLogCreate,
  WeightLogResponse,
} from '../types/weight.ts'

export interface WeightFilterParams {
  start_date?: string
  end_date?: string
}

export const weightApi = {
  async list(params: WeightFilterParams = {}): Promise<WeightLogResponse[]> {
    const query = new URLSearchParams()
    if (params.start_date) query.set('start_date', params.start_date)
    if (params.end_date) query.set('end_date', params.end_date)

    const qs = query.toString()
    return apiFetch<WeightLogResponse[]>(`/weights${qs ? `?${qs}` : ''}`)
  },

  async log(data: WeightLogCreate): Promise<WeightLogResponse> {
    return apiFetch<WeightLogResponse>('/weights', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async delete(id: string): Promise<void> {
    return apiFetch<void>(`/weights/${id}`, {
      method: 'DELETE',
    })
  },
}
