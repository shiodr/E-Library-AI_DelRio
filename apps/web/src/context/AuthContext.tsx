import { createContext, startTransition, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api, ApiError, client, post, setBearer } from '../lib/api'
import type { AuthResponse, Profile } from '../types'

interface AuthContextValue {
  profile: Profile | null
  loading: boolean
  connectionError: string
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (full_name: string, email: string, password: string) => Promise<void>
  guest: () => Promise<void>
  logout: (onSuccess: () => void) => Promise<void>
}
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState('')
  const epoch = useRef(0)
  const clear = useCallback(() => { epoch.current += 1; setBearer(null); setProfile(null) }, [])
  const refresh = useCallback(async () => {
    const requestEpoch = ++epoch.current
    setLoading(true)
    setConnectionError('')
    try {
      const result = await api<Profile>('/auth/me')
      if (requestEpoch === epoch.current) setProfile(result)
    }
    catch (error) {
      if (requestEpoch !== epoch.current) return
      if (error instanceof ApiError && error.status === 401) { setBearer(null); setProfile(null) }
      else setConnectionError(error instanceof Error ? error.message : 'Unable to check your session.')
    } finally { if (requestEpoch === epoch.current) setLoading(false) }
  }, [clear])
  useEffect(() => {
    void refresh()
    window.addEventListener('session-expired', clear)
    return () => window.removeEventListener('session-expired', clear)
  }, [refresh, clear])
  useEffect(() => {
    if (!profile) return
    const remaining = new Date(profile.expires_at).getTime() - Date.now()
    if (remaining <= 0) { clear(); return }
    const timer = window.setTimeout(() => {
      if (new Date(profile.expires_at).getTime() <= Date.now()) clear()
      else void refresh()
    }, Math.min(remaining, 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [profile, clear, refresh])

  async function authenticate(path: string, data: object) {
    epoch.current += 1
    setLoading(false)
    const result = await post<AuthResponse>(path, { ...data, client })
    setBearer(result.access_token)
    setProfile(result)
    setConnectionError('')
  }
  async function logout(onSuccess: () => void) {
    try { await post<void>('/auth/logout') }
    catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error }
    startTransition(() => { onSuccess(); clear() })
  }
  return <AuthContext.Provider value={{
    profile, loading, connectionError, refresh,
    login: (email, password) => authenticate('/auth/login', { email, password }),
    register: (full_name, email, password) => authenticate('/auth/register', { full_name, email, password }),
    guest: () => authenticate('/auth/guest', {}), logout,
  }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requires AuthProvider')
  return context
}
