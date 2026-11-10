import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { lazy, Suspense } from 'react'

const App = lazy(() => import('../App'))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <p role="status" className="p-8 text-sm text-muted">
            Opening your workspace…
          </p>
        }
      >
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/auth/callback" element={<App />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
