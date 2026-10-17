import React from 'react'
import { Link } from 'react-router-dom'
import { Flame, Home } from 'lucide-react'
import { Button } from '../components/ui/Button.tsx'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6 shadow-sm">
        <Flame className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h1>
      <h2 className="text-lg font-bold text-slate-700 mt-2">Page Not Found</h2>
      <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
        The page you are looking for does not exist in the NutriTrack application.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
