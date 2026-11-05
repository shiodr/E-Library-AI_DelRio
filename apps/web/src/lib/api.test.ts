import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const storage = vi.hoisted(() => ({
  native: true,
  vault: null as { token: string; apiBaseUrl: string } | null,
  read: vi.fn<(options: { apiBaseUrl: string }) => Promise<{ token: string | null }>>(),
  write: vi.fn<(options: { token: string; apiBaseUrl: string }) => Promise<void>>(),
  clear: vi.fn<() => Promise<void>>(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => storage.native },
  registerPlugin: () => ({ read: storage.read, write: storage.write, clear: storage.clear }),
}))

const apiBaseUrl = 'https://backend.example.test/api/v1'
const fetchMock = vi.fn<typeof fetch>()

function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
}

async function launch() {
  vi.resetModules()
  return import('./api')
}

function authorization() {
  return new Headers(fetchMock.mock.lastCall?.[1]?.headers).get('Authorization')
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', apiBaseUrl)
  storage.native = true
  storage.vault = null
  storage.read.mockReset().mockImplementation(async ({ apiBaseUrl: requestedUrl }) => ({
    token: storage.vault?.apiBaseUrl === requestedUrl ? storage.vault.token : null,
  }))
  storage.write.mockReset().mockImplementation(async value => { storage.vault = { ...value } })
  storage.clear.mockReset().mockImplementation(async () => { storage.vault = null })
  fetchMock.mockReset().mockImplementation(async () => json({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
  sessionStorage.clear()
})

afterEach(() => { vi.unstubAllEnvs(); sessionStorage.clear() })

describe('native session persistence', () => {
  it('restores the saved bearer after a new application process starts', async () => {
    const firstLaunch = await launch()
    await firstLaunch.setBearer('test-session-before-reopen')
    expect(storage.write).toHaveBeenCalledWith({ token: 'test-session-before-reopen', apiBaseUrl })

    const reopened = await launch()
    await reopened.restoreBearer()
    await reopened.api('/auth/me')

    expect(storage.read).toHaveBeenCalledWith({ apiBaseUrl })
    expect(authorization()).toBe('Bearer test-session-before-reopen')
    expect(fetchMock.mock.lastCall?.[1]?.credentials).toBe('omit')
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('keeps logout cleared after the application is reopened', async () => {
    const firstLaunch = await launch()
    await firstLaunch.setBearer('test-session-to-remove')
    await firstLaunch.setBearer(null)

    const reopened = await launch()
    await reopened.restoreBearer()
    await reopened.api('/auth/me')

    expect(storage.clear).toHaveBeenCalledOnce()
    expect(storage.vault).toBeNull()
    expect(authorization()).toBeNull()
  })

  it('retains the saved session through a network failure and subsequent reopen', async () => {
    const firstLaunch = await launch()
    await firstLaunch.setBearer('test-session-during-network-failure')
    fetchMock.mockRejectedValueOnce(new TypeError('Network unavailable'))
    await expect(firstLaunch.api('/auth/me')).rejects.toThrow('Cannot reach the library.')
    expect(storage.clear).not.toHaveBeenCalled()

    const reopened = await launch()
    await reopened.restoreBearer()
    await reopened.api('/auth/me')

    expect(authorization()).toBe('Bearer test-session-during-network-failure')
    expect(storage.vault?.token).toBe('test-session-during-network-failure')
  })

  it('does not let a delayed restore replace a newer login', async () => {
    let finishRead!: (value: { token: string | null }) => void
    storage.read.mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve }))
    const session = await launch()
    const restoring = session.restoreBearer()
    await vi.waitFor(() => expect(storage.read).toHaveBeenCalledOnce())

    const saving = session.setBearer('test-newer-session')
    finishRead({ token: 'test-old-restored-session' })
    await Promise.all([restoring, saving])
    await session.api('/auth/me')

    expect(authorization()).toBe('Bearer test-newer-session')
    expect(storage.vault?.token).toBe('test-newer-session')
  })

  it('serializes logout after a pending save so the session cannot reappear', async () => {
    let finishWrite!: () => void
    storage.write.mockImplementationOnce(value => new Promise(resolve => {
      finishWrite = () => { storage.vault = { ...value }; resolve() }
    }))
    const session = await launch()
    const saving = session.setBearer('test-session-with-pending-save')
    await vi.waitFor(() => expect(storage.write).toHaveBeenCalledOnce())
    const clearing = session.setBearer(null)
    finishWrite()
    await Promise.all([saving, clearing])

    const reopened = await launch()
    await reopened.restoreBearer()
    await reopened.api('/auth/me')
    expect(storage.vault).toBeNull()
    expect(authorization()).toBeNull()
  })

  it('reports a storage read failure and permits a successful retry', async () => {
    storage.vault = { token: 'test-session-after-storage-retry', apiBaseUrl }
    storage.read.mockRejectedValueOnce(new Error('Keystore temporarily unavailable'))
    const session = await launch()
    await expect(session.restoreBearer()).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()

    await session.restoreBearer()
    await session.api('/auth/me')
    expect(storage.read).toHaveBeenCalledTimes(2)
    expect(authorization()).toBe('Bearer test-session-after-storage-retry')
  })

  it('does not keep an authenticated bearer in memory when secure saving fails', async () => {
    storage.write.mockRejectedValueOnce(new Error('Secure storage unavailable'))
    const session = await launch()
    await expect(session.setBearer('test-session-that-cannot-be-saved')).rejects.toThrow()
    await session.api('/auth/me')

    expect(authorization()).toBeNull()
    expect(storage.vault).toBeNull()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('keeps website authentication cookie-based without accessing native storage', async () => {
    storage.native = false
    storage.vault = { token: 'test-native-session-unused-by-web', apiBaseUrl }
    const website = await launch()
    await website.restoreBearer()
    await website.setBearer(null)
    await website.api('/auth/me')

    expect(fetchMock.mock.lastCall?.[1]?.credentials).toBe('include')
    expect(authorization()).toBeNull()
    expect(storage.read).not.toHaveBeenCalled()
    expect(storage.write).not.toHaveBeenCalled()
    expect(storage.clear).not.toHaveBeenCalled()
  })
})
