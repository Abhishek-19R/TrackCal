import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronRight, RefreshCw, UserCheck, XCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext.tsx'
import { DEFAULT_DEV_USER_ID } from '../../api/client.ts'

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
      color: 'bg-emerald-500',
      text: 'Backend Online',
      textColor: 'text-emerald-700',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    },
    degraded: {
      color: 'bg-amber-500',
      text: 'Backend Degraded (DB issue)',
      textColor: 'text-amber-700',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
    },
    disconnected: {
      color: 'bg-rose-500',
      text: 'Backend Offline',
      textColor: 'text-rose-700',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
    },
    unhealthy: {
      color: 'bg-rose-500',
      text: 'Backend Unhealthy',
      textColor: 'text-rose-700',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
    },
    checking: {
      color: 'bg-slate-400 animate-pulse',
      text: 'Connecting...',
      textColor: 'text-slate-600',
      icon: <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />,
    },
  }[healthStatus]

  return (
    <div className="bg-slate-900 text-slate-300 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px] bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-md">
          Dev Mode
        </span>

        {isEditing ? (
          <form onSubmit={handleSaveUserId} className="inline-flex items-center gap-1.5">
            <span className="text-slate-400">X-User-ID:</span>
            <input
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="bg-slate-800 text-white font-mono text-xs px-2 py-0.5 rounded-md border border-slate-700 focus:outline-none focus:border-emerald-500 w-56"
              placeholder="24-char hex ObjectId"
            />
            <button
              type="submit"
              className="bg-emerald-600 text-white px-2 py-0.5 rounded-md hover:bg-emerald-500 font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-slate-400 hover:text-white px-1.5 py-0.5 underline"
            >
              Default
            </button>
            <button
              type="button"
              onClick={() => {
                setNewUserId(devUserId)
                setIsEditing(false)
              }}
              className="text-slate-400 hover:text-white px-1.5 py-0.5"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">User Identity:</span>
            <span className="font-mono text-slate-200 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700">
              {devUserId}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-emerald-400 hover:text-emerald-300 ml-1 underline inline-flex items-center gap-0.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Switch User</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${healthIndicator.color}`} />
          <span className="text-slate-300 font-medium">{healthIndicator.text}</span>
          <button
            onClick={() => void handleHealthRefresh()}
            disabled={isCheckingHealth}
            title="Refresh backend status"
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <span className="hidden md:inline-flex text-slate-500">|</span>
        <span className="hidden md:inline-flex text-slate-400 items-center gap-1">
          Self-Hosted <ChevronRight className="w-3 h-3 text-slate-600" /> MongoDB Isolated
        </span>
      </div>
    </div>
  )
}
