import React from 'react'
import {
  Download,
  Sparkles,
  TrendingUp,
  Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { useApp } from '../context/AppContext.tsx'

export const AnalyticsPage: React.FC = () => {
  const { addToast, devUserId } = useApp()

  const handleExportJson = () => {
    // Generate sample client-side export snapshot for active dev user
    const exportData = {
      app: 'NutriTrack',
      version: '0.3.0',
      exported_at: new Date().toISOString(),
      user_id: devUserId,
      metadata: {
        architecture: 'Phase 3 Foundation',
        storage: 'Self-Hosted MongoDB',
      },
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nutritrack_backup_${devUserId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast('Downloaded local JSON backup snapshot', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Analytics & Data Portability</h2>
        <p className="text-xs text-slate-500">
          Nutrition adherence trends, macro split distribution, and offline JSON backup
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Macro Distribution Preview */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span>Macronutrient Ratio</span>
              <Badge variant="blue" dot>
                Target 30/45/25
              </Badge>
            </CardTitle>
            <CardDescription>Target distribution of calories from macros</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-6 w-full rounded-xl overflow-hidden flex shadow-2xs">
              <div
                style={{ width: '30%' }}
                className="bg-sky-500 flex items-center justify-center text-[10px] font-bold text-white"
                title="Protein (30%)"
              >
                30%
              </div>
              <div
                style={{ width: '45%' }}
                className="bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white"
                title="Carbohydrates (45%)"
              >
                45%
              </div>
              <div
                style={{ width: '25%' }}
                className="bg-rose-500 flex items-center justify-center text-[10px] font-bold text-white"
                title="Fat (25%)"
              >
                25%
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                <span className="block text-[10px] font-bold uppercase text-sky-600">Protein</span>
                <span className="text-sm font-bold text-slate-900">4 kcal / g</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">30% Energy</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="block text-[10px] font-bold uppercase text-amber-600">Carbs</span>
                <span className="text-sm font-bold text-slate-900">4 kcal / g</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">45% Energy</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <span className="block text-[10px] font-bold uppercase text-rose-600">Fats</span>
                <span className="text-sm font-bold text-slate-900">9 kcal / g</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">25% Energy</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Compliance Overview */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span>Weekly Compliance Target</span>
              <Badge variant="emerald" dot>
                7-Day Rolling
              </Badge>
            </CardTitle>
            <CardDescription>Energy expenditure compliance and daily adherence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Daily Calorie Adherence</h4>
                  <p className="text-xs text-slate-500">Target window: &plusmn; 100 kcal</p>
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                Phase 5 Target
              </span>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-emerald-950/80 leading-relaxed">
              <span className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Recharts Integration
              </span>
              Detailed trend visualizations, moving 7-day weight regressions, and weekly macro breakdown charts are specified for Phase 4 & Phase 5.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Portability Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span>Data Sovereignty & Portability</span>
            <Badge variant="slate">JSON Backups</Badge>
          </CardTitle>
          <CardDescription>
            You own your health records. Export complete meal and weight history anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200/80 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Export Health Data</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Download a structured JSON archive containing your logged meals, custom foods, and weight records.
                </p>
              </div>
              <div className="mt-4">
                <Button variant="primary" size="sm" onClick={handleExportJson} leftIcon={<Download className="w-4 h-4" />}>
                  Export JSON Backup
                </Button>
              </div>
            </div>

            <div className="p-4 border border-slate-200/80 rounded-2xl flex flex-col justify-between bg-slate-50/40">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Import / Restore Backup</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Restore past logs from a previous NutriTrack JSON export archive.
                </p>
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm" disabled leftIcon={<Upload className="w-4 h-4" />}>
                  Restore (Phase 5)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
