export interface DatabaseHealth {
  status: 'connected' | 'disconnected'
  latency_ms?: number | null
  message?: string
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  app: string
  environment: string
  version: string
  database: DatabaseHealth
}
