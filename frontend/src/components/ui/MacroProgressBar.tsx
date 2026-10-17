import React from 'react'

export interface MacroProgressBarProps {
  label: string
  current: number
  target: number
  unit?: string
  color: 'emerald' | 'blue' | 'amber' | 'rose'
}

export const MacroProgressBar: React.FC<MacroProgressBarProps> = ({
  label,
  current,
  target,
  unit = 'g',
  color,
}) => {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0

  const barColorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-sky-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }[color]

  const textBadgeClasses = {
    emerald: 'text-emerald-700 bg-emerald-50',
    blue: 'text-sky-700 bg-sky-50',
    amber: 'text-amber-700 bg-amber-50',
    rose: 'text-rose-700 bg-rose-50',
  }[color]

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5 text-xs font-medium">
        <span className="text-slate-700 font-semibold">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-900 font-bold">
            {Math.round(current)}
            <span className="text-slate-400 font-normal"> / {target}{unit}</span>
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${textBadgeClasses}`}>
            {percentage}%
          </span>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColorClasses}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
