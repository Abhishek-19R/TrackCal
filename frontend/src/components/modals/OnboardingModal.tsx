import React, { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Droplet,
  Info,
  ShieldAlert,
} from 'lucide-react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import { Input } from '../ui/Input.tsx'
import { Select } from '../ui/Select.tsx'
import { Badge } from '../ui/Badge.tsx'
import { LoadingSpinner } from '../ui/LoadingSpinner.tsx'
import { useApp } from '../../context/AppContext.tsx'
import { userSettingsApi } from '../../api/userSettings.ts'
import type {
  ActivityLevel,
  GoalType,
  NutritionPlanPreview,
  OnboardingRequest,
  SexType,
  UnitSystem,
} from '../../types/user.ts'

export interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { completeOnboarding, addToast, userSettings } = useApp()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric')

  // Step 1: Body Metrics Form State
  const [heightCm, setHeightCm] = useState<string>('175')
  const [heightFt, setHeightFt] = useState<string>('5')
  const [heightIn, setHeightIn] = useState<string>('9')
  const [weightKg, setWeightKg] = useState<string>('75')
  const [weightLbs, setWeightLbs] = useState<string>('165')
  const [ageYears, setAgeYears] = useState<string>('28')
  const [sex, setSex] = useState<SexType>('male')

  // Step 2: Lifestyle Form State
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active')
  const [goal, setGoal] = useState<GoalType>('maintain')

  // Step 3: Plan Preview State
  const [preview, setPreview] = useState<NutritionPlanPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Populate from existing settings if available
  useEffect(() => {
    if (userSettings?.profile) {
      const p = userSettings.profile
      if (p.height_cm) {
        setHeightCm(p.height_cm.toString())
        const totalIn = p.height_cm / 2.54
        setHeightFt(Math.floor(totalIn / 12).toString())
        setHeightIn(Math.round(totalIn % 12).toString())
      }
      if (p.weight_kg) {
        setWeightKg(p.weight_kg.toString())
        setWeightLbs((Math.round(p.weight_kg / 0.45359237 * 10) / 10).toString())
      }
      if (p.age_years) setAgeYears(p.age_years.toString())
      if (p.sex) setSex(p.sex)
      if (p.activity_level) setActivityLevel(p.activity_level)
      if (p.goal) setGoal(p.goal)
      if (userSettings.unit_system) setUnitSystem(userSettings.unit_system)
    }
  }, [userSettings])

  // Build the OnboardingRequest DTO
  const buildRequest = useCallback((): OnboardingRequest => {
    const age = parseInt(ageYears, 10) || 25
    const base: OnboardingRequest = {
      age_years: age,
      sex,
      activity_level: activityLevel,
      goal,
      unit_system: unitSystem,
    }

    if (unitSystem === 'metric') {
      base.height_cm = parseFloat(heightCm) || 170
      base.weight_kg = parseFloat(weightKg) || 70
    } else {
      base.height_ft = parseInt(heightFt, 10) || 5
      base.height_in = parseFloat(heightIn) || 8
      base.weight_lbs = parseFloat(weightLbs) || 150
    }

    return base
  }, [
    ageYears,
    sex,
    activityLevel,
    goal,
    unitSystem,
    heightCm,
    weightKg,
    heightFt,
    heightIn,
    weightLbs,
  ])

  // Fetch preview when reaching Step 3
  useEffect(() => {
    if (step === 3 && isOpen) {
      const req = buildRequest()
      setIsLoadingPreview(true)
      setPreviewError(null)

      userSettingsApi
        .calculatePreview(req)
        .then((res) => {
          setPreview(res)
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : 'Failed to calculate preview'
          setPreviewError(msg)
        })
        .finally(() => {
          setIsLoadingPreview(false)
        })
    }
  }, [step, isOpen, buildRequest])

  const ageNum = parseInt(ageYears, 10) || 0
  const isUnderage = ageNum > 0 && ageNum < 18

  // Validation checks for Step 1
  const isStep1Valid = () => {
    if (ageNum < 18 || ageNum > 120) return false
    if (unitSystem === 'metric') {
      const h = parseFloat(heightCm)
      const w = parseFloat(weightKg)
      return h >= 50 && h <= 260 && w >= 20 && w <= 500
    } else {
      const ft = parseInt(heightFt, 10)
      const inc = parseFloat(heightIn)
      const w = parseFloat(weightLbs)
      return ft >= 1 && ft <= 8 && inc >= 0 && inc < 12 && w >= 44 && w <= 1100
    }
  }

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStep1Valid()) return
    setStep(2)
  }

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(3)
  }

  const handleConfirmPlan = async () => {
    const req = buildRequest()
    setIsSubmitting(true)
    try {
      await completeOnboarding(req)
      addToast('Nutrition plan personalized & baseline weight recorded!', 'success')
      onSuccess?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to complete onboarding'
      addToast(msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const activityOptions = [
    {
      value: 'sedentary',
      label: 'Sedentary (1.2×)',
      desc: 'Little or no exercise, desk job',
    },
    {
      value: 'lightly_active',
      label: 'Lightly Active (1.375×)',
      desc: 'Light exercise or sports 1–3 days per week',
    },
    {
      value: 'moderately_active',
      label: 'Moderately Active (1.55×)',
      desc: 'Moderate exercise or sports 3–5 days per week',
    },
    {
      value: 'very_active',
      label: 'Very Active (1.725×)',
      desc: 'Hard exercise or sports 6–7 days per week',
    },
    {
      value: 'extremely_active',
      label: 'Extremely Active (1.9×)',
      desc: 'Very hard daily exercise or physical labor job',
    },
  ]

  const goalOptions = [
    {
      value: 'maintain',
      label: 'Maintain Weight',
      desc: 'Neutral balance (±0 kcal) • 1.4 g/kg protein for daily health',
      badge: 'Balanced',
    },
    {
      value: 'lose',
      label: 'Lose Fat / Deficit',
      desc: 'Calorie deficit (-400 kcal) • 1.8 g/kg protein to preserve muscle',
      badge: '-400 kcal',
    },
    {
      value: 'gain',
      label: 'Build Muscle / Surplus',
      desc: 'Calorie surplus (+300 kcal) • 2.0 g/kg protein for hypertrophy',
      badge: '+300 kcal',
    },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Personalized Nutrition Setup"
      description="Calculate your scientific Mifflin–St Jeor daily calories and macronutrient targets."
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (s < step) setStep(s as 1 | 2 | 3)
                }}
                disabled={s > step}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  step === s
                    ? 'bg-emerald-600 text-white'
                    : s < step
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>{s}</span>
                <span className="hidden sm:inline">
                  {s === 1 ? 'Body Metrics' : s === 2 ? 'Activity & Goal' : 'Plan Review'}
                </span>
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-medium">Step {step} of 3</span>
        </div>

        {/* STEP 1: Body Metrics */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-4">
            {/* Unit Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Measurement Units
              </span>
              <div className="flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setUnitSystem('metric')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    unitSystem === 'metric'
                      ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Metric (cm / kg)
                </button>
                <button
                  type="button"
                  onClick={() => setUnitSystem('imperial')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    unitSystem === 'imperial'
                      ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Imperial (ft, in / lbs)
                </button>
              </div>
            </div>

            {/* Height & Weight Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {unitSystem === 'metric' ? (
                <Input
                  type="number"
                  step="0.5"
                  min="50"
                  max="260"
                  label="Height (cm)"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                  helperText="Valid range: 50 – 260 cm"
                  required
                />
              ) : (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Height (ft / in)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="8"
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                      placeholder="5"
                      rightIcon={<span className="text-xs font-bold text-slate-400">ft</span>}
                      required
                    />
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="11.9"
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      placeholder="9"
                      rightIcon={<span className="text-xs font-bold text-slate-400">in</span>}
                      required
                    />
                  </div>
                </div>
              )}

              {unitSystem === 'metric' ? (
                <Input
                  type="number"
                  step="0.1"
                  min="20"
                  max="500"
                  label="Current Weight (kg)"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="75"
                  helperText="Will be logged as initial baseline"
                  required
                />
              ) : (
                <Input
                  type="number"
                  step="0.1"
                  min="44"
                  max="1100"
                  label="Current Weight (lbs)"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  placeholder="165"
                  helperText="Will be converted to kg & logged as baseline"
                  required
                />
              )}
            </div>

            {/* Age & Sex Equation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="number"
                min="1"
                max="120"
                label="Age (Years)"
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                placeholder="28"
                error={
                  isUnderage
                    ? 'Mifflin–St Jeor equations are validated for adults 18 and older'
                    : undefined
                }
                required
              />

              <div className="space-y-1">
                <Select
                  label="BMR Formula Equation"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as SexType)}
                  options={[
                    { value: 'male', label: 'Male Equation (+5 coefficient)' },
                    { value: 'female', label: 'Female Equation (-161 coefficient)' },
                  ]}
                />
              </div>
            </div>

            {/* BMR Equation Explainer */}
            <div className="p-3.5 bg-sky-50 border border-sky-200/80 rounded-xl text-xs text-sky-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-sky-900">
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Mifflin–St Jeor BMR Equation Selection</span>
              </div>
              <p className="text-sky-700 leading-relaxed">
                The Mifflin–St Jeor formula calculates resting metabolic expenditure based on lean mass
                constants ({sex === 'male' ? '+5 kcal' : '-161 kcal'}). Choose the equation that corresponds to your biological profile.
              </p>
            </div>

            {isUnderage && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Underage Advisory:</span> Adult energy equations are
                  not validated for pediatric growth phases. You must be 18 or older to generate a
                  nutritional plan.
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={!isStep1Valid()}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Next: Activity & Goal
              </Button>
            </div>
          </form>
        )}

        {/* STEP 2: Activity Level & Goal */}
        {step === 2 && (
          <form onSubmit={handleNextStep2} className="space-y-5">
            {/* Activity Level Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Daily Physical Activity Level
              </label>
              <div className="space-y-2">
                {activityOptions.map((opt) => (
                  <label
                    key={opt.value}
                    onClick={() => setActivityLevel(opt.value as ActivityLevel)}
                    className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      activityLevel === opt.value
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-sm text-slate-900">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.desc}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                        activityLevel === opt.value
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {activityLevel === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Goal Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Primary Nutritional Goal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {goalOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => setGoal(opt.value as GoalType)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      goal === opt.value
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/20 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900">{opt.label}</span>
                        <Badge variant={goal === opt.value ? 'emerald' : 'slate'}>
                          {opt.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Next: Plan Preview
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: Plan Preview & Confirmation */}
        {step === 3 && (
          <div className="space-y-5">
            {isLoadingPreview ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <LoadingSpinner size="lg" />
                <p className="text-xs text-slate-500 font-medium">
                  Calculating scientific energy expenditure & macro splits...
                </p>
              </div>
            ) : previewError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Calculation Error</span>
                </div>
                <p>{previewError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="mt-2"
                >
                  Return to Body Metrics
                </Button>
              </div>
            ) : preview ? (
              <div className="space-y-5">
                {/* Hero Target Card */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-md shadow-emerald-950/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 bg-emerald-800/60 px-2 py-0.5 rounded">
                      Calculated Daily Budget
                    </span>
                    <Badge variant="emerald">
                      {goal === 'maintain'
                        ? 'Maintenance'
                        : goal === 'lose'
                        ? 'Deficit (-400)'
                        : 'Surplus (+300)'}
                    </Badge>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {preview.calorie_target.toLocaleString()}
                    </span>
                    <span className="text-emerald-200 font-semibold text-base">kcal / day</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-500/40 grid grid-cols-2 gap-3 text-xs text-emerald-100">
                    <div>
                      <span className="text-emerald-300 block">Basal Metabolic Rate (BMR)</span>
                      <span className="font-semibold text-white text-sm">
                        {Math.round(preview.bmr).toLocaleString()} kcal
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-300 block">Total Expenditure (TDEE)</span>
                      <span className="font-semibold text-white text-sm">
                        {Math.round(preview.tdee).toLocaleString()} kcal
                      </span>
                    </div>
                  </div>
                </div>

                {/* Safety Floor Notice */}
                {preview.floor_applied && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Calorie Safety Floor Triggered:</span> Your target
                      was clamped to the physiological safety floor (
                      {sex === 'male' ? '1,500 kcal' : '1,200 kcal'} minimum) to protect lean mass and
                      metabolic rate.
                    </div>
                  </div>
                )}

                {/* Macronutrient Split Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Protein */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Protein
                    </span>
                    <div className="text-lg font-bold text-emerald-700">
                      {preview.protein_target_g}
                      <span className="text-xs font-normal text-slate-500">g</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {Math.round((preview.protein_target_g * 4 / preview.calorie_target) * 100)}% of kcal
                    </span>
                  </div>

                  {/* Carbohydrates */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Carbs
                    </span>
                    <div className="text-lg font-bold text-amber-700">
                      {preview.carb_target_g}
                      <span className="text-xs font-normal text-slate-500">g</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {Math.round((preview.carb_target_g * 4 / preview.calorie_target) * 100)}% of kcal
                    </span>
                  </div>

                  {/* Fat */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Fats
                    </span>
                    <div className="text-lg font-bold text-purple-700">
                      {preview.fat_target_g}
                      <span className="text-xs font-normal text-slate-500">g</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {Math.round((preview.fat_target_g * 9 / preview.calorie_target) * 100)}% of kcal
                    </span>
                  </div>
                </div>

                {/* Hydration Recommendation */}
                <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-between text-xs text-sky-900">
                  <div className="flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-sky-600" />
                    <span className="font-medium">Recommended Water Intake:</span>
                  </div>
                  <span className="font-bold text-sky-950 font-mono">
                    {preview.water_target_ml} ml / day
                  </span>
                </div>

                {/* Disclaimer */}
                <p className="text-[11px] text-slate-500 italic leading-relaxed text-center">
                  "{preview.disclaimer}"
                </p>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={isSubmitting}
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleConfirmPlan}
                    isLoading={isSubmitting}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Confirm & Apply Plan
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  )
}
