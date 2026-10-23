import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronRight, RefreshCw, UserCheck, XCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext.tsx'
import { DEFAULT_DEV_USER_ID } from '../../api/client.ts'

/**
 * DevUserBanner
 *
 * Developer & Self-Hosted Status Bar
 *
 * FUTURE AUTHENTICATION ROADMAP & REQUIREMENTS:
 * 1. Current State: NutriTrack uses an `X-User-ID` header containing a valid 24-character
 *    hexadecimal MongoDB ObjectId for multi-tenant data isolation. This allows frictionless
 *    local development and immediate verification of isolated data stores without login friction.
 * 2. Production Auth Transition (Phase 5+):
 *    - Replace `X-User-ID` injection in `frontend/src/api/client.ts` with HttpOnly JWT session cookies
 *      or `Authorization: Bearer <token>` headers.
 *    - Implement standard `/api/v1/auth/register`, `/api/v1/auth/login`, and `/api/v1/auth/me` endpoints.
 *    - All backend repositories (`UserRepository`, `MealRepository`, `WeightRepository`, `UserSettingsRepository`)
 *      already enforce user isolation via `user_id` query parameters and require no schema changes when real auth is enabled.
 *    - Retain a dev flag (e.g., `VITE_ENABLE_DEV_USER_SWITCHER=false` in production) so developer identity
 *      switching remains available exclusively during self-hosted debugging and local test runs.
 */
export const DevUserBanner: React.FC = () => {
  const { devUserId, setDevUserId, healthStatus, checkHealth, addToast } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [newUserId, setNewUserId] = useState(devUserId)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)

  const handleSaveUserId = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newUserId.trim()
    if (!/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      addToast('User ID must be a 24-character hexadecimal string', 'error')
      return
    }
    setDevUserId(trimmed)
    setIsEditing(false)
    addToast('Active developer User ID updated', 'success')
  }

  const handleReset = () => {
    setNewUserId(DEFAULT_DEV_USER_ID)
    setDevUserId(DEFAULT_DEV_USER_ID)
    setIsEditing(false)
    addToast('Reset to default developer User ID', 'info')
  }

  const handleHealthRefresh = async () => {
    setIsCheckingHealth(true)
    await checkHealth()
    setIsCheckingHealth(false)
    addToast('Checked backend health', 'info')
  }

  const healthIndicator = {
    healthy: {
      color: 'bg-emerald-400',
      text: 'Backend Online',
      textColor: 'text-emerald-400',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
    },
    degraded: {
      color: 'bg-amber-400',
      text: 'Backend Degraded',
      textColor: 'text-amber-400',
      icon: <AlertCircle className="w-3 h-3 text-amber-400" />,
    },
    disconnected: {
      color: 'bg-rose-400',
      text: 'Backend Offline',
      textColor: 'text-rose-400',
      icon: <XCircle className="w-3 h-3 text-rose-400" />,
    },
    unhealthy: {
      color: 'bg-rose-400',
      text: 'Backend Unhealthy',
      textColor: 'text-rose-400',
      icon: <XCircle className="w-3 h-3 text-rose-400" />,
    },
    checking: {
      color: 'bg-slate-400 animate-pulse',
      text: 'Connecting...',
      textColor: 'text-slate-400',
      icon: <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />,
    },
  }[healthStatus]

  return (
    <div className="bg-slate-900 text-slate-300 text-[11px] leading-tight px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-emerald-400 uppercase tracking-widest text-[9px] bg-emerald-950/90 border border-emerald-800/80 px-1.5 py-0.5 rounded">
          Dev Mode
        </span>

        {isEditing ? (
          <form onSubmit={handleSaveUserId} className="inline-flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">User:</span>
            <input
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="bg-slate-800 text-white font-mono text-[11px] px-2 py-0.5 rounded border border-slate-700 focus:outline-none focus:border-emerald-500 w-52"
              placeholder="24-char hex ObjectId"
              autoFocus
            />
            <button
              type="submit"
              className="bg-emerald-600 text-white px-2 py-0.5 rounded hover:bg-emerald-500 font-semibold transition-colors cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-slate-400 hover:text-white px-1 py-0.5 underline transition-colors cursor-pointer"
            >
              Default
            </button>
            <button
              type="button"
              onClick={() => {
                setNewUserId(devUserId)
                setIsEditing(false)
              }}
              className="text-slate-400 hover:text-white px-1 py-0.5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">User:</span>
            <span className="font-mono text-slate-200 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700">
              {devUserId}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-emerald-400 hover:text-emerald-300 ml-1 inline-flex items-center gap-0.5 font-medium transition-colors cursor-pointer"
              title="Switch active user ObjectId"
            >
              <UserCheck className="w-3 h-3" />
              <span>Switch</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${healthIndicator.color}`} />
          <span className="text-slate-300 font-medium">{healthIndicator.text}</span>
          <button
            onClick={() => void handleHealthRefresh()}
            disabled={isCheckingHealth}
            title="Refresh backend status"
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <span className="hidden sm:inline-flex text-slate-600">|</span>
        <span className="hidden sm:inline-flex text-slate-400 items-center gap-1">
          Self-Hosted <ChevronRight className="w-2.5 h-2.5 text-slate-600" /> MongoDB Isolated
        </span>
      </div>
    </div>
  )
}
