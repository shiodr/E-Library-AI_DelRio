import { Capacitor, registerPlugin } from '@capacitor/core'

const configured = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'
export const API_BASE_URL = configured.replace(/\/$/, '')
export const native = Capacitor.isNativePlatform()
// The native vault encrypts sessions with Android Keystore; Web Storage never holds credentials.
let bearer: string | null = null
let sessionVersion = 0
interface NativeSessionStore {
  read(options: { apiBaseUrl: string }): Promise<{ token: string | null }>
  write(options: { token: string; apiBaseUrl: string }): Promise<void>
  clear(): Promise<void>
}
const sessionStore = registerPlugin<NativeSessionStore>('NativeSession')
let storageOperation: Promise<unknown> = Promise.resolve()
let restoration: Promise<void> | undefined

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

function useStorage<T>(operation: () => Promise<T>): Promise<T> {
  const next = storageOperation.catch(() => {}).then(operation)
  storageOperation = next
  return next.catch(() => {
    throw new ApiError('Cannot securely access your saved sign-in. Please try again.', 0)
  })
}

export async function setBearer(token: string | null): Promise<void> {
  const version = ++sessionVersion
  bearer = token
  if (!native) return
  try {
    await useStorage(() => token
      ? sessionStore.write({ token, apiBaseUrl: API_BASE_URL })
      : sessionStore.clear())
  } catch (error) {
    if (version === sessionVersion) { bearer = null; sessionVersion += 1 }
    throw error
  }
}

export function restoreBearer(): Promise<void> {
  if (!native) return Promise.resolve()
  if (!restoration) {
    const version = sessionVersion
    restoration = useStorage(() => sessionStore.read({ apiBaseUrl: API_BASE_URL }))
      .then(({ token }) => {
        if (version === sessionVersion) { bearer = token; sessionVersion += 1 }
      })
      .catch(error => { restoration = undefined; throw error })
  }
  return restoration
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const requestVersion = sessionVersion
  if (native) {
    const url = new URL(API_BASE_URL)
    if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) {
      throw new ApiError('Android requires a reachable HTTPS API. Set VITE_API_BASE_URL and rebuild.', 0)
    }
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: native ? 'omit' : 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('Cannot reach the library. Check your connection and try again.', 0)
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message = typeof data.detail === 'string'
      ? data.detail
      : response.status === 422 ? 'Check your details and try again.' : 'Something went wrong. Please try again.'
    // Session refresh and logout own their redirects; stale responses cannot clear a newer session.
    if (response.status === 401 && !['/auth/login', '/auth/me', '/auth/logout'].includes(path)
      && requestVersion === sessionVersion) window.dispatchEvent(new Event('session-expired'))
    throw new ApiError(message, response.status)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export function post<T>(path: string, data: unknown = {}) {
  return api<T>(path, { method: 'POST', body: JSON.stringify(data) })
}
export const client = native ? 'android' : 'web'
