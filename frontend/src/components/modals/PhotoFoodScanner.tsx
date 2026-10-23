import React, { useState, useRef } from 'react'
import {
  AlertCircle,
  Camera,
  Check,
  Edit3,
  ExternalLink,
  Flame,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '../ui/Button.tsx'
import { Input } from '../ui/Input.tsx'
import { Badge } from '../ui/Badge.tsx'
import { mealApi } from '../../api/meals.ts'
import { useApp } from '../../context/AppContext.tsx'
import type { MealType } from '../../types/meal.ts'
import {
  analyzeFoodPhoto,
  ensureCatalogFoodId,
  getStoredAiKey,
  hasStoredAiKey,
  recalculateItemNutrients,
  setStoredAiKey,
  type DetectedFoodItem,
  type VisionAnalysisResult,
  VisionKeyMissingError,
  VisionQuotaExceededError,
} from '../../services/aiVision/index.ts'

export interface PhotoFoodScannerProps {
  targetDate: string
  mealType: MealType
  mealLabel: string
  onSuccess: () => void
  onClose: () => void
  onSwitchToSearch: () => void
}

type ScanStep = 'upload' | 'analyzing' | 'review'

export const PhotoFoodScanner: React.FC<PhotoFoodScannerProps> = ({
  targetDate,
  mealType,
  mealLabel,
  onSuccess,
  onClose,
  onSwitchToSearch,
}) => {
  const { addToast } = useApp()

  const [step, setStep] = useState<ScanStep>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [userContext, setUserContext] = useState('')

  // Inline Key State (if user hasn't saved in Settings yet)
  const [hasKey, setHasKey] = useState<boolean>(() => hasStoredAiKey())
  const [inlineKeyInput, setInlineKeyInput] = useState('')
  const [showKeyPrompt, setShowKeyPrompt] = useState(!hasStoredAiKey())

  // Analysis Result & Review State
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null)
  const [items, setItems] = useState<DetectedFoodItem[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Loading & Error States
  const [isSubmittingMeal, setIsSubmittingMeal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isQuotaError, setIsQuotaError] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMessage(null)
    setIsQuotaError(false)
    setSelectedFile(file)

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  const handleClearImage = () => {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setErrorMessage(null)
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleSaveInlineKey = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inlineKeyInput.trim()) return
    setStoredAiKey(inlineKeyInput.trim())
    setHasKey(true)
    setShowKeyPrompt(false)
    setErrorMessage(null)
    addToast('Free Gemini API key saved to device', 'success')
  }

  const handleAnalyzePhoto = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select or capture a photo first.')
      return
    }

    const key = getStoredAiKey() || inlineKeyInput.trim()
    if (!key) {
      setShowKeyPrompt(true)
      setErrorMessage('A free Gemini API key is required to scan food photos.')
      return
    }

    setStep('analyzing')
    setErrorMessage(null)
    setIsQuotaError(false)

    try {
      const result = await analyzeFoodPhoto(selectedFile, userContext.trim() || undefined, key)
      setAnalysisResult(result)
      setItems(result.items)
      setStep('review')
    } catch (err: unknown) {
      setStep('upload')
      if (err instanceof VisionQuotaExceededError) {
        setIsQuotaError(true)
        setErrorMessage(err.message)
      } else if (err instanceof VisionKeyMissingError) {
        setShowKeyPrompt(true)
        setErrorMessage(err.message)
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to analyze food photo.'
        setErrorMessage(msg)
      }
    }
  }

  // Review Item Actions
  const handleWeightChange = (id: string, newWeight: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return recalculateItemNutrients(item, newWeight)
        }
        return item
      })
    )
  }

  const handleNameChange = (id: string, newName: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    )
  }

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleAddCustomItem = () => {
    const newItem: DetectedFoodItem = {
      id: `manual_${Date.now()}`,
      name: 'Additional Item',
      estimated_portion_description: '100g portion',
      estimated_weight_g: 100,
      confidence: 'high',
      is_verified_from_catalog: false,
      calories: 120,
      protein_g: 5,
      carbs_g: 15,
      fat_g: 3,
    }
    setItems((prev) => [...prev, newItem])
    setEditingItemId(newItem.id)
  }

  // Macro totals across all reviewed items
  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0)
  const totalProtein = Math.round(items.reduce((sum, item) => sum + item.protein_g, 0) * 10) / 10
  const totalCarbs = Math.round(items.reduce((sum, item) => sum + item.carbs_g, 0) * 10) / 10
  const totalFat = Math.round(items.reduce((sum, item) => sum + item.fat_g, 0) * 10) / 10
  const totalWeight = items.reduce((sum, item) => sum + item.estimated_weight_g, 0)

  // Confirm and Log Meal
  const handleConfirmMeal = async () => {
    if (items.length === 0) {
      setErrorMessage('Please include at least one food item to log.')
      return
    }

    setIsSubmittingMeal(true)
    setErrorMessage(null)

    try {
      // 1. Resolve every item to a persistent catalog food ID
      const resolvedItemsPayload = []
      for (const item of items) {
        const foodId = await ensureCatalogFoodId(item)
        resolvedItemsPayload.push({
          food_id: foodId,
          serving_selected: {
            description: item.estimated_portion_description || `${item.estimated_weight_g}g portion`,
            weight_g: item.estimated_weight_g,
          },
          number_of_servings: 1,
        })
      }

      // 2. Log all items through the existing meal API
      await mealApi.logMeal({
        date: targetDate,
        meal_type: mealType,
        items: resolvedItemsPayload,
        notes: userContext.trim()
          ? `Scanned: ${userContext.trim()}`
          : analysisResult?.meal_description
            ? `Scanned: ${analysisResult.meal_description}`
            : undefined,
      })

      addToast(`Logged ${items.length} items to ${mealLabel} via Photo Scan`, 'success')
      handleClearImage()
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save confirmed meal.'
      setErrorMessage(msg)
    } finally {
      setIsSubmittingMeal(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Error / Quota Notice Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          {isQuotaError && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSwitchToSearch}
              className="shrink-0 text-xs py-1"
            >
              Search Catalog Instead
            </Button>
          )}
        </div>
      )}

      {/* STEP 1: UPLOAD / CAPTURE VIEW */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {!previewUrl ? (
            /* Upload & Camera Buttons Card */
            <div className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 rounded-2xl p-6 sm:p-8 bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors text-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Camera className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Snap or Upload Food Photo
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                AI Vision identifies every dish on your plate, estimates portion weights, and calculates macros automatically.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => cameraInputRef.current?.click()}
                  leftIcon={<Camera className="w-4 h-4" />}
                >
                  Take Photo (Mobile Camera)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Browse Files
                </Button>
              </div>

              <p className="text-[11px] text-slate-400 mt-4">
                Supports JPEG, PNG, WEBP (Max 10MB) &bull; Photo stays on device
              </p>
            </div>
          ) : (
            /* Image Preview Card */
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
              <div className="relative rounded-xl overflow-hidden bg-slate-900 max-h-64 flex items-center justify-center group">
                <img
                  src={previewUrl}
                  alt="Food plate preview"
                  className="max-h-64 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-2.5 right-2.5 p-1.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg transition-colors cursor-pointer shadow-md"
                  title="Remove and retake image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                <span className="font-medium truncate max-w-[200px]">
                  {selectedFile?.name || 'food_photo.jpg'}
                </span>
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                >
                  Change Photo
                </button>
              </div>
            </div>
          )}

          {/* Optional context text / chat accompaniment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Add Context / Clarification (Optional)
            </label>
            <Input
              placeholder="e.g. 2 whole wheat rotis, dal tadka made with 1 tsp ghee, grilled chicken breast..."
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              maxLength={250}
              helperText="Helps AI identify specific preparations, oil usage, or hidden ingredients accurately."
            />
          </div>

          {/* Inline Key Setup (if missing) */}
          {(!hasKey || showKeyPrompt) && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 space-y-2.5">
              <div className="flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-purple-900">
                    Free Gemini API Key Required
                  </h5>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    NutriTrack uses your private client-side API key for photo scanning. Your key resides strictly on this device and is never sent to our servers.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveInlineKey} className="flex gap-2 pt-1">
                <input
                  type="password"
                  placeholder="Paste Gemini API Key (AIzaSy...)"
                  value={inlineKeyInput}
                  onChange={(e) => setInlineKeyInput(e.target.value)}
                  className="flex-1 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                <Button type="submit" variant="primary" size="sm">
                  Save Key
                </Button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-purple-700 pt-0.5">
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline inline-flex items-center gap-1 hover:text-purple-900"
                >
                  Get free key from Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={onSwitchToSearch}
                  className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Log manually instead &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={onSwitchToSearch}>
              Search Catalog Manually
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleAnalyzePhoto}
                disabled={!selectedFile}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Analyze Food Photo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: ANALYZING STATE */}
      {step === 'analyzing' && (
        <div className="py-12 px-4 text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-emerald-100 animate-ping opacity-60" />
            <div className="relative w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">
              Analyzing Food Plate...
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Google Gemini Vision is identifying ingredients, estimating portion weights, and matching verified catalog records.
            </p>
          </div>
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 max-w-sm mx-auto">
            💡 <strong>NutriTrack Rule:</strong> You will review and can edit all portion weights and foods before anything is logged.
          </div>
        </div>
      )}

      {/* STEP 3: EDITABLE REVIEW & CONFIRMATION SCREEN */}
      {step === 'review' && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Thumb"
                  className="w-12 h-12 rounded-xl object-cover border border-emerald-200 shadow-2xs shrink-0"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-950">
                    {analysisResult?.meal_description || 'Identified Meal Items'}
                  </span>
                  <Badge variant={analysisResult?.overall_confidence === 'high' ? 'emerald' : 'amber'} size="sm">
                    {analysisResult?.overall_confidence || 'medium'} confidence
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Review and adjust portion sizes below. Changes dynamically recalculate macros.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep('upload')}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="shrink-0"
            >
              Re-scan
            </Button>
          </div>

          {/* Clarification prompt if returned by AI */}
          {analysisResult?.clarification_needed && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">AI Note: </strong>
                {analysisResult.clarification_needed}
              </div>
            </div>
          )}

          {/* Editable Items List */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingItemId === item.id ? (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleNameChange(item.id, e.target.value)}
                        onBlur={() => setEditingItemId(null)}
                        autoFocus
                        className="text-sm font-bold text-slate-900 border-b border-emerald-500 bg-transparent px-1 focus:outline-none w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => setEditingItemId(item.id)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Rename item"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {item.likely_preparation && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.likely_preparation}
                          </span>
                        )}
                        {item.is_verified_from_catalog ? (
                          <Badge variant="emerald" size="sm">
                            Verified Catalog
                          </Badge>
                        ) : (
                          <Badge variant="amber" size="sm">
                            AI Estimate
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                    title="Remove item from plate"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Portion Stepper & Live Macros */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">Portion (g):</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleWeightChange(item.id, Math.max(10, item.estimated_weight_g - 25))}
                        className="w-6 h-6 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold flex items-center justify-center text-slate-700 cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="5"
                        max="2000"
                        step="5"
                        value={item.estimated_weight_g}
                        onChange={(e) => handleWeightChange(item.id, parseFloat(e.target.value) || 0)}
                        className="w-16 text-center text-xs font-bold rounded-md border border-slate-200 bg-white px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleWeightChange(item.id, item.estimated_weight_g + 25)}
                        className="w-6 h-6 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold flex items-center justify-center text-slate-700 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Macros Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[11px]">
                      {item.calories} kcal
                    </span>
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                      P: {item.protein_g}g
                    </span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 font-medium">
                      C: {item.carbs_g}g
                    </span>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 font-medium">
                      F: {item.fat_g}g
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Item Button */}
          <button
            type="button"
            onClick={handleAddCustomItem}
            className="w-full py-2 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30"
          >
            <Plus className="w-3.5 h-3.5" /> Add Another Item
          </button>

          {/* Plate Totals Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Flame className="w-4 h-4 text-emerald-400" />
                Plate Totals: {totalCalories} kcal
              </span>
              <span className="text-slate-400 text-[11px]">
                {items.length} items &bull; {totalWeight}g total
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-800/80 rounded-lg p-1.5">
                <div className="text-[10px] text-blue-400 font-semibold uppercase">Protein</div>
                <div className="text-sm font-bold text-blue-200">{totalProtein}g</div>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-1.5">
                <div className="text-[10px] text-amber-400 font-semibold uppercase">Carbs</div>
                <div className="text-sm font-bold text-amber-200">{totalCarbs}g</div>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-1.5">
                <div className="text-[10px] text-purple-400 font-semibold uppercase">Fat</div>
                <div className="text-sm font-bold text-purple-200">{totalFat}g</div>
              </div>
            </div>
          </div>

          {/* Confirmation Action Row */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('upload')}
              disabled={isSubmittingMeal}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmMeal}
              isLoading={isSubmittingMeal}
              disabled={items.length === 0}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Confirm & Log to {mealLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
