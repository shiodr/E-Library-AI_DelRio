import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Brand, ErrorState, LoadingPage, Spinner } from './ui'

export function ProtectedRoute() {
  const { profile, loading, connectionError, endedSession, refresh, guest } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()
  const from = location.pathname + location.search
  async function resumeGuest() {
    setBusy(true); setError('')
    try { await guest() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to start a guest session.') }
    finally { setBusy(false) }
  }
  if (loading) return <LoadingPage />
  if (connectionError) return <ErrorState message={connectionError} retry={() => void refresh()} />
  if (profile) return <Outlet />
  if (endedSession === 'guest') return <main className="session-recovery"><Brand /><div className="empty-state library-empty">
    <h1>Your guest session ended.</h1><p>Start a new guest session to keep exploring. Sign in to keep your personal library across devices.</p>
    {error && <ErrorState message={error} />}
    <div className="guest-state-actions"><button className="button primary" onClick={() => void resumeGuest()} disabled={busy}>{busy && <Spinner />}Continue as Guest</button>
      <Link className="button secondary" to="/login" state={{ from }}>Sign in</Link><Link className="text-link" to="/register" state={{ from }}>Create account</Link></div>
  </div></main>
  return <Navigate to="/login" state={{ from, notice: endedSession === 'user' ? 'Your session has expired. Please sign in again.' : undefined }} replace />
}
