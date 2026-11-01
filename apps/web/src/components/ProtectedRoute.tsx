import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ErrorState, LoadingPage } from './ui'

export function ProtectedRoute() {
  const { profile, loading, connectionError, refresh } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingPage />
  if (connectionError) return <ErrorState message={connectionError} retry={() => void refresh()} />
  return profile ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
}
