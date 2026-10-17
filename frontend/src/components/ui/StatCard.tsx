import React from 'react'
import { Card } from './Card.tsx'

export interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate'
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  subtitle,
  icon,
  color = 'emerald',
}) => {
  const iconBgClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-sky-50 text-sky-600 border-sky-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  }[color]

  return (
    <Card className="p-5 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </span>
          {unit && <span className="text-xs sm:text-sm font-medium text-slate-500">{unit}</span>}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {icon && (
        <div
          className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${iconBgClasses}`}
        >
          {icon}
        </div>
      )}
    </Card>
  )
}
