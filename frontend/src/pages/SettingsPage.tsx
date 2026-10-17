import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import {
  Check,
  KeyRound,
  RefreshCw,
  Sliders,
  UserCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { useApp } from '../context/AppContext.tsx'
import { DEFAULT_DEV_USER_ID, getApiBaseUrl } from '../api/client.ts'

export const SettingsPage: FC = () => {
  const {
    devUserId,
    setDevUserId,
    targets,
    updateTargets,
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

  // Dev User Form State
  const [inputUserId, setInputUserId] = useState(devUserId)
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false)

  // Client AI Key State
  const [geminiKey, setGeminiKey] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('nutritrack_client_gemini_key') || '' : ''
  })
  const [isKeySaved, setIsKeySaved] = useState(false)

  const handleSaveTargets = (e: FormEvent) => {
    e.preventDefault()
    updateTargets({
      calories: parseFloat(calories) || 2000,
      protein_g: parseFloat(protein) || 150,
      carbs_g: parseFloat(carbs) || 200,
      fat_g: parseFloat(fat) || 65,
      water_ml: parseFloat(water) || 2500,
    })
    addToast('Daily nutritional targets saved', 'success')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Application Settings</h2>
        <p className="text-xs text-slate-500">
          Daily nutritional goals, developer environment identity, and client-side preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Target Goals Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                <span>Daily Nutrition Targets</span>
              </div>
              <Badge variant="emerald">Live</Badge>
            </CardTitle>
            <CardDescription>
              Adjust your daily calorie budget and target macronutrient gram splits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveTargets} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min="500"
                  max="10000"
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
                  max="1000"
                  label="Target Carbs (g)"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  required
                />
                <Input
                  type="number"
                  min="0"
                  max="1000"
                  label="Target Fat (g)"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  required
                />
              </div>

              <Input
                type="number"
                min="0"
                max="10000"
                label="Target Water (ml)"
                value={water}
                onChange={(e) => setWater(e.target.value)}
              />

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" leftIcon={<Check className="w-4 h-4" />}>
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
      </div>

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
            In accordance with NutriTrack security rules, AI keys are NEVER sent to or stored on the backend server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveAiKey} className="space-y-4 max-w-xl">
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
  )
}
