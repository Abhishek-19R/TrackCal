import { apiFetch } from './client.ts'
import type { HealthResponse } from '../types/health.ts'

export const healthApi = {
  async check(): Promise<HealthResponse> {
    return apiFetch<HealthResponse>('/health')
  },
}
