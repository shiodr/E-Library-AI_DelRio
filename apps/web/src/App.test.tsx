import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import * as apiModule from './lib/api'

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
  it('renders landing and explains the programming catalog access types', async () => {
    open()
    expect(screen.getByRole('heading', { name: /your next chapter/i })).toBeInTheDocument()
    expect(await screen.findByText(/Free online editions and paid publisher listings are labeled separately/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeEnabled()
  })

  it('labels a paid book and links to its publisher without offering a free download', async () => {
    const book = { id: 'paid-rust', title: 'Rust for Rustaceans', author: 'Jon Gjengset', category: 'Rust', description: 'Advanced Rust programming techniques.', cover_url: null, source_url: 'https://nostarch.com/rust-rustaceans', license_type: 'Publisher listing; purchase required.', access_type: 'paid' }
    handler = url => url.endsWith('/auth/me') ? json(member) : url.endsWith('/books/paid-rust') ? json(book) : json(catalog)
    open('/app/books/paid-rust')
    expect(await screen.findByText('PAID PUBLISHER LISTING')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View publisher listing/ })).toHaveAttribute('href', book.source_url)
    expect(screen.getByRole('button', { name: /Save to favorites/ })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Record tracking demonstration/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument()
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
    expect(await screen.findByText('Download tracking demonstration')).toBeInTheDocument()
    await user.click(screen.getAllByRole('link', { name: /ai assistant/i })[0])
    expect(await screen.findByText(/AI generation is not configured/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Ask the library' })).toBeEnabled()
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

  it('waits for saved native credentials before checking the current profile', async () => {
    let finishRestore!: () => void
    const restore = vi.spyOn(apiModule, 'restoreBearer').mockImplementation(() => new Promise<void>(resolve => { finishRestore = resolve }))
    handler = url => url.endsWith('/auth/me') ? json(member) : url.endsWith('/categories') ? json([]) : json(catalog)
    open('/app')
    await waitFor(() => expect(restore).toHaveBeenCalledOnce())
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/auth/me'))).toBe(false)
    await act(async () => { finishRestore() })
    expect(await screen.findByRole('heading', { name: /hello, alex/i })).toBeInTheDocument()
  })

  it('returns home when logout discovers a revoked session', async () => {
    const original = handler
    handler = url => url.endsWith('/auth/me') ? json(guest) : url.endsWith('/auth/logout') ? json({ detail: 'Session expired.' }, 401) : original(url)
    open('/app')
    await userEvent.click(await screen.findByRole('button', { name: 'End guest session' }))
    expect(await screen.findByRole('heading', { name: /your next chapter/i })).toBeInTheDocument()
  })

  it('returns real linked catalog recommendations and sends follow-up conversation context', async () => {
    const book = { id: 'rust-id', title: 'The Rust Programming Language', author: 'Rust Project', category: 'Rust', description: 'Learn Rust.', cover_url: null, source_url: 'https://doc.rust-lang.org/book/', license_type: 'Authorized online edition', access_type: 'free_to_read' }
    const messages: { message: string; conversation_id: string | null }[] = []
    handler = (url, options) => {
      if (url.endsWith('/auth/me')) return json(member)
      if (url.endsWith('/assistant/status')) return json({ generation_available: false, provider: 'openai', model: null })
      if (url.endsWith('/assistant/chat')) {
        messages.push(JSON.parse(String(options?.body)))
        return json({ conversation_id: 'conversation-1', answer: 'One matching active catalog record.', books: [book], mode: 'catalog_only', generation_available: false, model: null })
      }
      return json(catalog)
    }
    open('/app/assistant')
    const input = await screen.findByRole('textbox', { name: 'Ask the library' })
    await userEvent.type(input, 'Find beginner Rust books')
    await userEvent.click(screen.getByRole('button', { name: 'Send question' }))
    expect(await screen.findByRole('link', { name: /The Rust Programming Language/ })).toHaveAttribute('href', '/app/books/rust-id')
    await userEvent.type(input, 'Which are free?')
    await userEvent.click(screen.getByRole('button', { name: 'Send question' }))
    await waitFor(() => expect(messages).toHaveLength(2))
    expect(messages[1].conversation_id).toBe('conversation-1')
  })

  it('records a tracking demonstration and retains its success message through a background profile refresh', async () => {
    const book = { id: 'free-rust', title: 'The Rust Programming Language', author: 'Rust Project', category: 'Rust', description: 'Learn Rust.', cover_url: null, source_url: 'https://doc.rust-lang.org/book/', license_type: 'Authorized online edition', access_type: 'free_to_read' }
    let recorded = false
    handler = (url, options) => {
      if (url.endsWith('/auth/me')) return json({ ...member, downloads_used: recorded ? 1 : 0 })
      if (url.endsWith('/books/free-rust')) return json(book)
      if (url.endsWith('/downloads') && options?.method === 'POST') { recorded = true; return json({ already_downloaded: false, allowance: { used: 1, limit: 10, remaining: 9 } }, 201) }
      return json(catalog)
    }
    open('/app/books/free-rust')
    await userEvent.click(await screen.findByRole('button', { name: 'Record tracking demonstration' }))
    expect(await screen.findByRole('status')).toHaveTextContent('No file was downloaded.')
    expect(screen.getByRole('status')).toHaveTextContent('1 of 10 tracked.')
    expect(recorded).toBe(true)
  })

  it('denies the administrator screen to a normal registered account without requesting admin data', async () => {
    handler = url => url.endsWith('/auth/me') ? json(member) : json(catalog)
    open('/app/admin')
    expect(await screen.findByRole('heading', { name: 'Administrator access required.' })).toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/admin/'))).toBe(false)
  })

  it('distinguishes a configured provider failure from a missing AI key', async () => {
    handler = url => {
      if (url.endsWith('/auth/me')) return json(member)
      if (url.endsWith('/assistant/status')) return json({ generation_available: true, provider: 'openai', model: 'gpt-5-mini' })
      if (url.endsWith('/assistant/chat')) return json({ conversation_id: 'retry-conversation', answer: 'AI generation is unavailable right now. No matching books.', books: [], mode: 'provider_error', generation_available: false, model: 'gpt-5-mini' })
      return json(catalog)
    }
    open('/app/assistant')
    await userEvent.type(await screen.findByRole('textbox', { name: 'Ask the library' }), 'Rust books')
    await userEvent.click(screen.getByRole('button', { name: 'Send question' }))
    expect(await screen.findByText('Catalog retrieval · AI generation temporarily unavailable')).toBeInTheDocument()
    expect(screen.getByText('AI configured')).toBeInTheDocument()
    expect(screen.queryByText('Catalog retrieval is available. AI generation is not configured.')).not.toBeInTheDocument()
  })
})
