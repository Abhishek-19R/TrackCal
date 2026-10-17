import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { DevUserBanner } from './DevUserBanner.tsx'
import { Sidebar } from './Sidebar.tsx'
import { Header } from './Header.tsx'
import { MobileNav } from './MobileNav.tsx'
import { QuickLogFoodModal } from '../modals/QuickLogFoodModal.tsx'
import { QuickLogWeightModal } from '../modals/QuickLogWeightModal.tsx'
import { useApp } from '../../context/AppContext.tsx'

export const AppLayout: React.FC = () => {
  const { toasts, dismissToast } = useApp()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [quickFoodModalOpen, setQuickFoodModalOpen] = useState(false)
  const [quickWeightModalOpen, setQuickWeightModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Developer Context & Health Header */}
      <DevUserBanner />

      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Navigation Drawer */}
        <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
          <Header
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onQuickLogFood={() => setQuickFoodModalOpen(true)}
            onQuickLogWeight={() => setQuickWeightModalOpen(true)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Global Quick Action Modals */}
      <QuickLogFoodModal
        isOpen={quickFoodModalOpen}
        onClose={() => setQuickFoodModalOpen(false)}
        onSuccess={() => {
          // Trigger custom event so active pages can re-fetch if needed
          window.dispatchEvent(new CustomEvent('nutritrack:data-refresh'))
        }}
      />

      <QuickLogWeightModal
        isOpen={quickWeightModalOpen}
        onClose={() => setQuickWeightModalOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent('nutritrack:data-refresh'))
        }}
      />

      {/* Toast Notifications Container */}
      <div className="fixed bottom-16 lg:bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const icon = {
            success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
            error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
            info: <Info className="w-4 h-4 text-sky-500 shrink-0" />,
          }[toast.type]

          return (
            <div
              key={toast.id}
              className="pointer-events-auto bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex items-center gap-2">
                {icon}
                <span className="font-medium">{toast.text}</span>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
