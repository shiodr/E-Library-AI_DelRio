import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

const guest = { session_type: 'guest', user: null, expires_at: '2099-01-01T00:00:00Z', planned_download_limit: 5, access_token: null }
const member = { ...guest, session_type: 'user', planned_download_limit: 10, user: { id: '1', full_name: 'Alex Reader', email: 'alex@example.com', role: 'reader' } }
const catalog = { items: [], total: 0, limit: 12, offset: 0 }
let handler: (url: string, options?: RequestInit) => Response
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }) }
beforeEach(() => {
  handler = url => url.endsWith('/auth/me') ? json({ detail: 'Sign in required.' }, 401) : url.endsWith('/categories') ? json([]) : json(catalog)
  vi.stubGlobal('fetch', vi.fn((url: string, options?: RequestInit) => Promise.resolve(handler(url, options))))
})
function open(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><MotionConfig reducedMotion="always"><ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider></MotionConfig></MemoryRouter>)
}

describe('Phase 1 interfaces', () => {
  it('renders landing and explicitly identifies the starter catalog', async () => {
    open()
    expect(screen.getByRole('heading', { name: /your next chapter/i })).toBeInTheDocument()
    expect(await screen.findByText(/small starter catalog/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeEnabled()
  })

  it('validates registration fields before calling registration API', async () => {
    const user = userEvent.setup()
    open('/register')
    await user.type(screen.getByLabelText('Full name'), 'A')
    await user.type(screen.getByLabelText('Email address'), 'invalid')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'short')
    await user.type(screen.getByLabelText('Confirm password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Use at least 12 characters.')).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/auth/register'))).toBe(false)
  })

  it('shows a login error and then opens the dashboard after successful login', async () => {
    let attempts = 0
    const original = handler
    handler = url => url.endsWith('/auth/login') ? (++attempts === 1 ? json({ detail: 'Email or password is incorrect.' }, 401) : json(member)) : original(url)
    const user = userEvent.setup()
    open('/login')
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'a-long-test-passphrase')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('heading', { name: /hello, alex/i })).toBeInTheDocument()
  })

  it('creates a backend guest session, navigates modules, and ends the session', async () => {
    const original = handler
    handler = url => url.endsWith('/auth/guest') ? json(guest, 201) : url.endsWith('/auth/logout') ? new Response(null, { status: 204 }) : original(url)
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: /continue as guest/i }))
    expect(await screen.findByText('Guest reader')).toBeInTheDocument()
    await user.click(screen.getAllByRole('link', { name: /my library/i })[0])
    expect(await screen.findByText('5-book download allowance planned')).toBeInTheDocument()
    await user.click(screen.getAllByRole('link', { name: /ai assistant/i })[0])
    expect(await screen.findByText(/AI is not connected/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'End guest session' }))
    expect(await screen.findByRole('heading', { name: /your next chapter/i })).toBeInTheDocument()
  })

  it('preserves the intended route through registration', async () => {
    const original = handler
    handler = url => url.endsWith('/auth/register') ? json(member, 201) : original(url)
    const user = userEvent.setup()
    open('/app/favorites')
    await user.click(await screen.findByRole('link', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Full name'), 'Alex Reader')
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'a-long-test-passphrase')
    await user.type(screen.getByLabelText('Confirm password'), 'a-long-test-passphrase')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: /Favorites\s*\./ })).toBeInTheDocument()
  })

  it('shows catalog network failures with a working retry', async () => {
    let failed = true
    const original = handler
    handler = url => {
      if (url.includes('/books') && failed) throw new TypeError('Network unavailable')
      return original(url)
    }
    // Fetch must return a rejected Promise as browsers do on network failure.
    vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => handler(url, options)))
    open()
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the library.')
    failed = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('ignores a stale initial profile response after login', async () => {
    let finishProfile!: (value: Response) => void
    const original = handler
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/auth/me')) return new Promise<Response>(resolve => { finishProfile = resolve })
      return Promise.resolve(url.endsWith('/auth/login') ? json(member) : original(url))
    }))
    const user = userEvent.setup()
    open('/login')
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'a-long-test-passphrase')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('heading', { name: /hello, alex/i })).toBeInTheDocument()
    await act(async () => { finishProfile(json({ detail: 'Old session expired.' }, 401)) })
    expect(screen.getByRole('heading', { name: /hello, alex/i })).toBeInTheDocument()
  })

  it('returns home when logout discovers a revoked session', async () => {
    const original = handler
    handler = url => url.endsWith('/auth/me') ? json(guest) : url.endsWith('/auth/logout') ? json({ detail: 'Session expired.' }, 401) : original(url)
    open('/app')
    await userEvent.click(await screen.findByRole('button', { name: 'End guest session' }))
    expect(await screen.findByRole('heading', { name: /your next chapter/i })).toBeInTheDocument()
  })
})
