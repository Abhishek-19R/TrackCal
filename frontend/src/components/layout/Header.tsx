import React from 'react'
import { useLocation } from 'react-router-dom'
import { Calendar, Menu, PlusCircle, Scale, Utensils } from 'lucide-react'
import { Button } from '../ui/Button.tsx'

export interface HeaderProps {
  onOpenMobileMenu: () => void
  onQuickLogFood?: () => void
  onQuickLogWeight?: () => void
}

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: "Daily overview and nutrition progress" },
  '/log': { title: 'Meal Log', subtitle: "Record foods and inspect daily meals" },
  '/foods': { title: 'Food Database', subtitle: "Catalog of system staples and custom foods" },
  '/weight': { title: 'Weight Tracker', subtitle: "Body weight history and trends" },
  '/analytics': { title: 'Analytics', subtitle: "Trends, macro compliance, and data portability" },
  '/settings': { title: 'Settings', subtitle: "Preferences, daily targets, and developer tools" },
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onQuickLogFood,
  onQuickLogWeight,
}) => {
  const location = useLocation()
  const routeInfo = ROUTE_TITLES[location.pathname] || {
    title: 'NutriTrack',
    subtitle: 'Nutrition and weight management',
  }

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <header className="h-16 px-4 sm:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {routeInfo.title}
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block leading-none mt-0.5">
            {routeInfo.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>{todayFormatted}</span>
        </div>

        {onQuickLogWeight && (
          <Button
            variant="outline"
            size="sm"
            onClick={onQuickLogWeight}
            className="hidden sm:inline-flex"
            leftIcon={<Scale className="w-3.5 h-3.5" />}
          >
            Log Weight
          </Button>
        )}

        {onQuickLogFood && (
          <Button
            variant="primary"
            size="sm"
            onClick={onQuickLogFood}
            leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">Log Meal</span>
            <span className="sm:hidden">
              <Utensils className="w-3.5 h-3.5" />
            </span>
          </Button>
        )}
      </div>
    </header>
  )
}
