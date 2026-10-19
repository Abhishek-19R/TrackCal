import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { healthApi } from '../api/health.ts'
import { getActiveDevUserId, setActiveDevUserId } from '../api/client.ts'
import { userSettingsApi } from '../api/userSettings.ts'
import type { HealthResponse } from '../types/health.ts'
import type {
  CustomTargetsUpdate,
  OnboardingRequest,
  UnitSystem,
  UserProfileUpdate,
  UserSettingsResponse,
} from '../types/user.ts'

export interface DailyTargets {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
}

const DEFAULT_TARGETS: DailyTargets = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 200,
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
  userSettings: UserSettingsResponse | null
  isLoadingSettings: boolean
  refreshSettings: () => Promise<UserSettingsResponse | null>
  completeOnboarding: (data: OnboardingRequest) => Promise<UserSettingsResponse>
  updateProfile: (data: UserProfileUpdate) => Promise<UserSettingsResponse>
  updateCustomTargets: (data: CustomTargetsUpdate) => Promise<UserSettingsResponse>
  recalculateTargets: () => Promise<UserSettingsResponse>
  targets: DailyTargets
  updateTargets: (newTargets: Partial<DailyTargets>) => void
  isOnboardingCompleted: boolean
  unitSystem: UnitSystem
  onboardingModalOpen: boolean
  setOnboardingModalOpen: (open: boolean) => void
  toasts: ToastMessage[]
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void
  dismissToast: (id: string) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devUserId, setDevUserIdState] = useState<string>(() => getActiveDevUserId())
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthStatus, setHealthStatus] = useState<
    'healthy' | 'degraded' | 'unhealthy' | 'disconnected' | 'checking'
  >('checking')
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [userSettings, setUserSettings] = useState<UserSettingsResponse | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true)
  const [onboardingModalOpen, setOnboardingModalOpen] = useState<boolean>(false)

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

  const applySettingsToState = useCallback((settings: UserSettingsResponse) => {
    setUserSettings(settings)
    const newTargets: DailyTargets = {
      calories: settings.calorie_target,
      protein_g: settings.protein_target_g,
      carbs_g: settings.carb_target_g,
      fat_g: settings.fat_target_g,
      water_ml: settings.water_target_ml,
    }
    setTargets(newTargets)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TARGETS, JSON.stringify(newTargets))
    }
  }, [])

  const refreshSettings = useCallback(async (): Promise<UserSettingsResponse | null> => {
    setIsLoadingSettings(true)
    try {
      const res = await userSettingsApi.getSettings(devUserId)
      applySettingsToState(res)
      return res
    } catch (err) {
      console.warn('Failed to load user settings:', err)
      return null
    } finally {
      setIsLoadingSettings(false)
    }
  }, [devUserId, applySettingsToState])

  useEffect(() => {
    void checkHealth()
    void refreshSettings()

    const interval = setInterval(() => {
      void checkHealth()
    }, 30000)
    return () => clearInterval(interval)
  }, [checkHealth, refreshSettings])

  const setDevUserId = useCallback((id: string) => {
    const cleanId = id.trim()
    setDevUserIdState(cleanId)
    setActiveDevUserId(cleanId)
  }, [])

  const completeOnboarding = useCallback(
    async (data: OnboardingRequest): Promise<UserSettingsResponse> => {
      const res = await userSettingsApi.completeOnboarding(data, devUserId)
      applySettingsToState(res)
      window.dispatchEvent(new CustomEvent('nutritrack:data-refresh'))
      return res
    },
    [devUserId, applySettingsToState]
  )

  const updateProfile = useCallback(
    async (data: UserProfileUpdate): Promise<UserSettingsResponse> => {
      const res = await userSettingsApi.updateProfile(data, devUserId)
      applySettingsToState(res)
      window.dispatchEvent(new CustomEvent('nutritrack:data-refresh'))
      return res
    },
    [devUserId, applySettingsToState]
  )

  const updateCustomTargets = useCallback(
    async (data: CustomTargetsUpdate): Promise<UserSettingsResponse> => {
      const res = await userSettingsApi.updateTargets(data, devUserId)
      applySettingsToState(res)
      window.dispatchEvent(new CustomEvent('nutritrack:data-refresh'))
      return res
    },
    [devUserId, applySettingsToState]
  )

  const recalculateTargets = useCallback(async (): Promise<UserSettingsResponse> => {
    const res = await userSettingsApi.recalculateTargets(devUserId)
    applySettingsToState(res)
    window.dispatchEvent(new CustomEvent('nutritrack:data-refresh'))
    return res
  }, [devUserId, applySettingsToState])

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

  const addToast = useCallback(
    (text: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      setToasts((prev) => [...prev, { id, type, text }])
      setTimeout(() => {
        dismissToast(id)
      }, 4000)
    },
    [dismissToast]
  )

  const isOnboardingCompleted = userSettings?.profile?.is_onboarding_completed ?? false
  const unitSystem: UnitSystem = userSettings?.unit_system ?? 'metric'

  return (
    <AppContext.Provider
      value={{
        devUserId,
        setDevUserId,
        health,
        healthStatus,
        checkHealth,
        userSettings,
        isLoadingSettings,
        refreshSettings,
        completeOnboarding,
        updateProfile,
        updateCustomTargets,
        recalculateTargets,
        targets,
        updateTargets,
        isOnboardingCompleted,
        unitSystem,
        onboardingModalOpen,
        setOnboardingModalOpen,
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
