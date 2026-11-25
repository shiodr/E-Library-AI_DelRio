import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, useLocation } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { useNativeNavigation } from './useNativeNavigation'

const { app, remove } = vi.hoisted(() => {
  const remove = vi.fn()
  return { remove, app: {
    addListener: vi.fn(async (_event: string, _back: (event: { canGoBack: boolean }) => void) => ({ remove })),
    exitApp: vi.fn(),
  } }
})
vi.mock('@capacitor/app', () => ({ App: app }))
vi.mock('@capacitor/status-bar', () => ({ StatusBar: { setStyle: vi.fn(async () => {}) }, Style: { Light: 'LIGHT' } }))
vi.mock('../lib/api', () => ({ native: true }))

function Screen() {
  useNativeNavigation()
  return <><p>{useLocation().pathname}</p><Link to="/app/explore">Explore</Link><Link to="/app/library">My Library</Link></>
}

it('uses the current route for Back and keeps one native listener across tabs', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<MemoryRouter initialEntries={['/', '/app']}><Screen /></MemoryRouter>)
  const back = app.addListener.mock.calls[0][1]

  await user.click(screen.getByRole('link', { name: 'Explore' }))
  await user.click(screen.getByRole('link', { name: 'My Library' }))
  act(() => back({ canGoBack: true }))
  expect(screen.getByText('/app/explore')).toBeInTheDocument()
  act(() => back({ canGoBack: true }))
  expect(screen.getByText('/app')).toBeInTheDocument()
  act(() => back({ canGoBack: true }))
  expect(app.exitApp).toHaveBeenCalledOnce()
  expect(app.addListener).toHaveBeenCalledOnce()

  unmount()
  await waitFor(() => expect(remove).toHaveBeenCalledOnce())
})
