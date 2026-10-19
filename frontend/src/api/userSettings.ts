import { apiFetch } from './client.ts'
import type {
  CustomTargetsUpdate,
  NutritionPlanPreview,
  OnboardingRequest,
  UserProfileUpdate,
  UserSettingsResponse,
} from '../types/user.ts'

export const userSettingsApi = {
  /**
   * Fetch current user settings, auto-creating defaults if none exist yet.
   */
  getSettings: async (userId?: string): Promise<UserSettingsResponse> => {
    return apiFetch<UserSettingsResponse>('/user/settings', { userId })
  },

  /**
   * Complete the initial onboarding flow:
   * Sets profile, calculates BMR/TDEE & macro targets, marks onboarding completed,
   * and records initial baseline body weight.
   */
  completeOnboarding: async (
    data: OnboardingRequest,
    userId?: string
  ): Promise<UserSettingsResponse> => {
    return apiFetch<UserSettingsResponse>('/user/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
      userId,
    })
  },

  /**
   * Update physical profile. If targets are not in manual override mode,
   * targets will automatically be recalculated by the backend.
   */
  updateProfile: async (
    data: UserProfileUpdate,
    userId?: string
  ): Promise<UserSettingsResponse> => {
    return apiFetch<UserSettingsResponse>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
      userId,
    })
  },

  /**
   * Manually override daily targets. Sets is_custom_override = true.
   */
  updateTargets: async (
    data: CustomTargetsUpdate,
    userId?: string
  ): Promise<UserSettingsResponse> => {
    return apiFetch<UserSettingsResponse>('/user/targets', {
      method: 'PUT',
      body: JSON.stringify(data),
      userId,
    })
  },

  /**
   * Reset targets back to calculated values based on profile,
   * clearing the custom override flag.
   */
  recalculateTargets: async (userId?: string): Promise<UserSettingsResponse> => {
    return apiFetch<UserSettingsResponse>('/user/recalculate-targets', {
      method: 'POST',
      userId,
    })
  },

  /**
   * Stateless preview of BMR, TDEE, macro split without saving to database.
   */
  calculatePreview: async (
    data: OnboardingRequest,
    userId?: string
  ): Promise<NutritionPlanPreview> => {
    return apiFetch<NutritionPlanPreview>('/user/calculate-preview', {
      method: 'POST',
      body: JSON.stringify(data),
      userId,
    })
  },
}
