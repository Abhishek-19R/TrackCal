import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Calendar,
  Database,
  Flame,
  LayoutDashboard,
  Scale,
  Settings,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'

export const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/log', label: 'Meal Log', icon: UtensilsCrossed },
  { to: '/foods', label: 'Food Database', icon: Database },
  { to: '/weight', label: 'Weight Tracker', icon: Scale },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-sm shadow-emerald-500/25">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
              NutriTrack
            </h1>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest leading-none">
              Health Platform
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1">
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Sidebar Footer Info Card */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-100 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs mb-1">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Phase 3 Foundation</span>
          </div>
          <p className="text-[11px] text-emerald-950/70 leading-relaxed">
            Stitch-aligned design tokens with native FastAPI integration.
          </p>
          <div className="mt-2.5 pt-2 border-t border-emerald-200/50 flex items-center justify-between text-[10px] text-emerald-700 font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              v0.3.0
            </span>
            <span className="bg-emerald-200/60 text-emerald-800 px-1.5 py-0.5 rounded">
              Ready
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
