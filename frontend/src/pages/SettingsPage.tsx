import { useState, useEffect } from 'react'
import type { FC, FormEvent } from 'react'
import {
  AlertCircle,
  Check,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Select } from '../components/ui/Select.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { LoadingSpinner } from '../components/ui/LoadingSpinner.tsx'
import { useApp } from '../context/AppContext.tsx'
import { DEFAULT_DEV_USER_ID, getApiBaseUrl } from '../api/client.ts'
import type { ActivityLevel, GoalType, SexType, UnitSystem } from '../types/user.ts'

export const SettingsPage: FC = () => {
  const {
    devUserId,
    setDevUserId,
    targets,
    userSettings,
    isLoadingSettings,
    updateCustomTargets,
    updateProfile,
    recalculateTargets,
    setOnboardingModalOpen,
    health,
    healthStatus,
    checkHealth,
    addToast,
  } = useApp()

  // Targets Form State
  const [calories, setCalories] = useState(targets.calories.toString())
  const [protein, setProtein] = useState(targets.protein_g.toString())
  const [carbs, setCarbs] = useState(targets.carbs_g.toString())
  const [fat, setFat] = useState(targets.fat_g.toString())
  const [water, setWater] = useState(targets.water_ml.toString())
  const [isSavingTargets, setIsSavingTargets] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)

  // Profile Form State
  const [heightCm, setHeightCm] = useState('175')
  const [weightKg, setWeightKg] = useState('75')
  const [ageYears, setAgeYears] = useState('28')
  const [sex, setSex] = useState<SexType>('male')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active')
  const [goal, setGoal] = useState<GoalType>('maintain')
  const [unitSystemState, setUnitSystemState] = useState<UnitSystem>('metric')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Dev User Form State
  const [inputUserId, setInputUserId] = useState(devUserId)
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false)

  // Client AI Key State
  const [geminiKey, setGeminiKey] = useState(() => {
    return typeof window !== 'undefined'
      ? localStorage.getItem('nutritrack_client_gemini_key') || ''
      : ''
  })
  const [isKeySaved, setIsKeySaved] = useState(false)

  // Synchronize state when userSettings changes
  useEffect(() => {
    if (userSettings) {
      setCalories(userSettings.calorie_target.toString())
      setProtein(userSettings.protein_target_g.toString())
      setCarbs(userSettings.carb_target_g.toString())
      setFat(userSettings.fat_target_g.toString())
      setWater(userSettings.water_target_ml.toString())
      setUnitSystemState(userSettings.unit_system)

      if (userSettings.profile) {
        const p = userSettings.profile
        if (p.height_cm) setHeightCm(p.height_cm.toString())
        if (p.weight_kg) setWeightKg(p.weight_kg.toString())
        if (p.age_years) setAgeYears(p.age_years.toString())
        if (p.sex) setSex(p.sex)
        if (p.activity_level) setActivityLevel(p.activity_level)
        if (p.goal) setGoal(p.goal)
      }
    }
  }, [userSettings])

  const handleSaveTargets = async (e: FormEvent) => {
    e.preventDefault()
    setIsSavingTargets(true)
    try {
      await updateCustomTargets({
        calorie_target: parseInt(calories, 10) || 2000,
        protein_target_g: parseFloat(protein) || 150,
        carb_target_g: parseFloat(carbs) || 200,
        fat_target_g: parseFloat(fat) || 65,
        water_target_ml: parseInt(water, 10) || 2500,
        unit_system: unitSystemState,
      })
      addToast('Daily nutritional targets saved (Manual Override active)', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save targets'
      addToast(msg, 'error')
    } finally {
      setIsSavingTargets(false)
    }
  }

  const handleRecalculate = async () => {
    setIsRecalculating(true)
    try {
      await recalculateTargets()
      addToast('Targets recalculated from Mifflin–St Jeor profile!', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to recalculate targets'
      addToast(msg, 'error')
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    try {
      await updateProfile({
        height_cm: parseFloat(heightCm) || undefined,
        weight_kg: parseFloat(weightKg) || undefined,
        age_years: parseInt(ageYears, 10) || undefined,
        sex,
        activity_level: activityLevel,
        goal,
        unit_system: unitSystemState,
      })
      addToast(
        userSettings?.is_custom_override
          ? 'Profile saved! (Note: Manual targets are preserved)'
          : 'Profile saved & targets automatically updated!',
        'success'
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile'
      addToast(msg, 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSaveDevUser = (e: FormEvent) => {
    e.preventDefault()
    const clean = inputUserId.trim()
    if (!/^[0-9a-fA-F]{24}$/.test(clean)) {
      addToast('User ID must be a 24-character hexadecimal ObjectId', 'error')
      return
    }
    setDevUserId(clean)
    addToast('Switched active developer User ID', 'success')
  }

  const handleResetDevUser = () => {
    setInputUserId(DEFAULT_DEV_USER_ID)
    setDevUserId(DEFAULT_DEV_USER_ID)
    addToast('Reset to default dev user ID', 'info')
  }

  const handleSaveAiKey = (e: FormEvent) => {
    e.preventDefault()
    if (typeof window !== 'undefined') {
      localStorage.setItem('nutritrack_client_gemini_key', geminiKey.trim())
      setIsKeySaved(true)
      setTimeout(() => setIsKeySaved(false), 2500)
      addToast('Client AI key stored in browser storage', 'success')
    }
  }

  const handleClearAiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nutritrack_client_gemini_key')
      setGeminiKey('')
      addToast('Removed local AI key', 'info')
    }
  }

  if (isLoadingSettings && !userSettings) {
    return <LoadingSpinner text="Loading user configuration..." className="py-20" />
  }

  const isOverride = userSettings?.is_custom_override ?? false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Application Settings</h2>
          <p className="text-xs text-slate-500">
            Personal body metrics, energy metabolism targets, and client-side preferences
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOnboardingModalOpen(true)}
          leftIcon={<Sparkles className="w-4 h-4 text-emerald-600" />}
        >
          {userSettings?.profile?.is_onboarding_completed
            ? 'Rerun Onboarding Wizard'
            : 'Start Onboarding Wizard'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Physical Profile & Metabolism Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                <span>Physical Profile & Metabolism</span>
              </div>
              <Badge variant={userSettings?.profile?.is_onboarding_completed ? 'emerald' : 'amber'}>
                {userSettings?.profile?.is_onboarding_completed ? 'Profile Active' : 'Unconfigured'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Biological attributes used for the Mifflin–St Jeor energy expenditure equations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Metabolism Summary Chips */}
            {userSettings?.bmr_estimate && userSettings?.tdee_estimate && (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Basal Metabolic Rate
                  </span>
                  <div className="text-lg font-extrabold text-emerald-950">
                    {Math.round(userSettings.bmr_estimate)}
                    <span className="text-xs font-normal text-emerald-800 ml-1">kcal/day</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Maintenance (TDEE)
                  </span>
                  <div className="text-lg font-extrabold text-emerald-950">
                    {Math.round(userSettings.tdee_estimate)}
                    <span className="text-xs font-normal text-emerald-800 ml-1">kcal/day</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="0.5"
                  min="50"
                  max="260"
                  label="Height (cm)"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  required
                />
                <Input
                  type="number"
                  step="0.1"
                  min="20"
                  max="500"
                  label="Weight (kg)"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min="18"
                  max="120"
                  label="Age (Years)"
                  value={ageYears}
                  onChange={(e) => setAgeYears(e.target.value)}
                  required
                />
                <Select
                  label="BMR Sex Equation"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as SexType)}
                  options={[
                    { value: 'male', label: 'Male (+5 constant)' },
                    { value: 'female', label: 'Female (-161 constant)' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Activity Level"
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  options={[
                    { value: 'sedentary', label: 'Sedentary (1.2×)' },
                    { value: 'lightly_active', label: 'Lightly Active (1.375×)' },
                    { value: 'moderately_active', label: 'Moderately Active (1.55×)' },
                    { value: 'very_active', label: 'Very Active (1.725×)' },
                    { value: 'extremely_active', label: 'Extremely Active (1.9×)' },
                  ]}
                />
                <Select
                  label="Nutritional Goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as GoalType)}
                  options={[
                    { value: 'maintain', label: 'Maintain (±0 kcal, 1.4g/kg P)' },
                    { value: 'lose', label: 'Deficit / Fat Loss (-400 kcal, 1.8g/kg P)' },
                    { value: 'gain', label: 'Surplus / Muscle (+300 kcal, 2.0g/kg P)' },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  {isOverride
                    ? '⚠️ Target override active: targets will not change automatically'
                    : '✨ Targets will recalculate automatically on save'}
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingProfile}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Daily Target Goals Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                <span>Daily Nutrition Targets</span>
              </div>
              <Badge variant={isOverride ? 'purple' : 'emerald'}>
                {isOverride ? 'Manual Override' : 'Formula Calculated'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Customizable daily calorie budget, macronutrient grams, and water targets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Override Advisory & Recalculate Button */}
            {isOverride ? (
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-between gap-3 text-xs text-purple-900">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Manual targets override formula updates.</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculate}
                  isLoading={isRecalculating}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="shrink-0 bg-white hover:bg-purple-50 text-purple-700 border-purple-200"
                >
                  Recalculate
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                <span>Targets synchronizing automatically with your profile.</span>
                <span className="font-semibold text-emerald-900">Mifflin–St Jeor</span>
              </div>
            )}

            <form onSubmit={handleSaveTargets} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min="500"
                  max="15000"
                  label="Target Calories (kcal)"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  required
                />
                <Input
                  type="number"
                  min="0"
                  max="1000"
                  label="Target Protein (g)"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min="0"
                  max="1500"
                  label="Target Carbs (g)"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  required
                />
                <Input
                  type="number"
                  min="0"
                  max="500"
                  label="Target Fat (g)"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  required
                />
              </div>

              <Input
                type="number"
                min="0"
                max="20000"
                label="Target Water (ml)"
                value={water}
                onChange={(e) => setWater(e.target.value)}
              />

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Saving manual values engages Custom Override mode.
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingTargets}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Targets
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Developer Context & Identity */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-600" />
                <span>Developer Mode Identity</span>
              </div>
              <Badge variant="blue">Dev Header</Badge>
            </CardTitle>
            <CardDescription>
              NutriTrack uses strict user-scoping with an X-User-ID request header.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSaveDevUser} className="space-y-3">
              <Input
                label="Active Dev User ID (24 Hex ObjectId)"
                value={inputUserId}
                onChange={(e) => setInputUserId(e.target.value)}
                placeholder="65f000000000000000000001"
                required
              />

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetDevUser}
                >
                  Reset Default
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Apply User
                </Button>
              </div>
            </form>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-semibold">Backend API URL:</span>
                <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {getApiBaseUrl()}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-semibold">Health Status:</span>
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      healthStatus === 'healthy'
                        ? 'bg-emerald-500'
                        : healthStatus === 'degraded'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="capitalize">{healthStatus}</span>
                  {health?.database.latency_ms && (
                    <span className="text-slate-400 font-normal">
                      ({health.database.latency_ms.toFixed(1)}ms ping)
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setIsRefreshingHealth(true)
                    await checkHealth()
                    setIsRefreshingHealth(false)
                    addToast('Backend health verified', 'info')
                  }}
                  isLoading={isRefreshingHealth}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Check Connectivity
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client-Side AI Storage Notice Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-600" />
                <span>Client-Side AI Integration (Optional)</span>
              </div>
              <Badge variant="purple">Architecture Enforced</Badge>
            </CardTitle>
            <CardDescription>
              In accordance with NutriTrack security rules, AI keys are NEVER sent to or stored on
              the backend server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveAiKey} className="space-y-4">
              <Input
                type="password"
                label="Gemini / OpenAI API Key (Saved to localStorage only)"
                placeholder="AIzaSy... or sk-..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                helperText="This key resides strictly in your browser storage and will only be invoked client-side for Phase 6 enhancements."
              />

              <div className="flex items-center gap-2">
                <Button type="submit" variant="primary" size="sm">
                  {isKeySaved ? 'Saved Locally!' : 'Save Local Key'}
                </Button>
                {geminiKey && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAiKey}
                  >
                    Clear Key
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
