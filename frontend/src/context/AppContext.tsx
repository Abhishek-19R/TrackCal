import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { healthApi } from '../api/health.ts'
import { getActiveDevUserId, setActiveDevUserId } from '../api/client.ts'
import type { HealthResponse } from '../types/health.ts'

export interface DailyTargets {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
}

const DEFAULT_TARGETS: DailyTargets = {
  calories: 2100,
  protein_g: 150,
  carbs_g: 220,
  fat_g: 65,
  water_ml: 2500,
}

const STORAGE_KEY_TARGETS = 'nutritrack_daily_targets'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
}

interface AppContextValue {
  devUserId: string
  setDevUserId: (id: string) => void
  health: HealthResponse | null
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected' | 'checking'
  checkHealth: () => Promise<void>
  targets: DailyTargets
  updateTargets: (newTargets: Partial<DailyTargets>) => void
  toasts: ToastMessage[]
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void
  dismissToast: (id: string) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devUserId, setDevUserIdState] = useState<string>(() => getActiveDevUserId())
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'unhealthy' | 'disconnected' | 'checking'>('checking')
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [targets, setTargets] = useState<DailyTargets>(() => {
    if (typeof window === 'undefined') return DEFAULT_TARGETS
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TARGETS)
      if (saved) return { ...DEFAULT_TARGETS, ...JSON.parse(saved) }
    } catch {
      // Fallback
    }
    return DEFAULT_TARGETS
  })

  const checkHealth = useCallback(async () => {
    try {
      const res = await healthApi.check()
      setHealth(res)
      setHealthStatus(res.status)
    } catch {
      setHealthStatus('disconnected')
    }
  }, [])

  useEffect(() => {
    void checkHealth()
    const interval = setInterval(() => {
      void checkHealth()
    }, 30000)
    return () => clearInterval(interval)
  }, [checkHealth])

  const setDevUserId = useCallback((id: string) => {
    const cleanId = id.trim()
    setDevUserIdState(cleanId)
    setActiveDevUserId(cleanId)
  }, [])

  const updateTargets = useCallback((newTargets: Partial<DailyTargets>) => {
    setTargets((prev) => {
      const updated = { ...prev, ...newTargets }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_TARGETS, JSON.stringify(updated))
      }
      return updated
    })
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    setToasts((prev) => [...prev, { id, type, text }])
    setTimeout(() => {
      dismissToast(id)
    }, 4000)
  }, [dismissToast])

  return (
    <AppContext.Provider
      value={{
        devUserId,
        setDevUserId,
        health,
        healthStatus,
        checkHealth,
        targets,
        updateTargets,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return ctx
}
