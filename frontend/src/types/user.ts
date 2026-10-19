export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active'

export type GoalType = 'maintain' | 'gain' | 'lose'
export type SexType = 'male' | 'female'
export type UnitSystem = 'metric' | 'imperial'

export interface UserProfile {
  height_cm?: number | null
  weight_kg?: number | null
  age_years?: number | null
  sex?: SexType | null
  activity_level?: ActivityLevel | null
  goal?: GoalType | null
  is_onboarding_completed: boolean
}

export interface OnboardingRequest {
  height_cm?: number
  height_ft?: number
  height_in?: number
  weight_kg?: number
  weight_lbs?: number
  age_years: number
  sex: SexType
  activity_level: ActivityLevel
  goal: GoalType
  unit_system?: UnitSystem
}

export interface UserProfileUpdate {
  height_cm?: number
  weight_kg?: number
  age_years?: number
  sex?: SexType
  activity_level?: ActivityLevel
  goal?: GoalType
  unit_system?: UnitSystem
}

export interface CustomTargetsUpdate {
  calorie_target?: number
  protein_target_g?: number
  carb_target_g?: number
  fat_target_g?: number
  water_target_ml?: number
  unit_system?: UnitSystem
}

export interface NutritionPlanPreview {
  bmr: number
  tdee: number
  calorie_target: number
  protein_target_g: number
  carb_target_g: number
  fat_target_g: number
  water_target_ml: number
  goal: string
  activity_level: string
  floor_applied: boolean
  disclaimer: string
}

export interface UserSettingsResponse {
  id: string
  user_id: string
  profile: UserProfile
  bmr_estimate?: number | null
  tdee_estimate?: number | null
  is_custom_override: boolean
  calorie_target: number
  protein_target_g: number
  carb_target_g: number
  fat_target_g: number
  water_target_ml: number
  unit_system: UnitSystem
  updated_at: string
}
