import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext.tsx'
import { AppLayout } from './components/layout/AppLayout.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { FoodLogPage } from './pages/FoodLogPage.tsx'
import { FoodDatabasePage } from './pages/FoodDatabasePage.tsx'
import { WeightTrackerPage } from './pages/WeightTrackerPage.tsx'
import { AnalyticsPage } from './pages/AnalyticsPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="log" element={<FoodLogPage />} />
            <Route path="foods" element={<FoodDatabasePage />} />
            <Route path="weight" element={<WeightTrackerPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
