import { BookHeart, BookOpen, Compass, Home, LogOut, Sparkles, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Brand, ThemeToggle } from './ui'
import { native } from '../lib/api'

const links = [
  { to: '/app', label: 'Overview', icon: Home, end: true },
  { to: '/app/explore', label: 'Explore books', icon: Compass },
  { to: '/app/library', label: 'My Library', icon: BookOpen },
  { to: '/app/favorites', label: 'Favorites', icon: BookHeart },
  { to: '/app/assistant', label: 'AI Assistant', icon: Sparkles },
]
export function AppLayout() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const guest = profile?.session_type === 'guest'
  async function signOut() {
    setBusy(true)
    try { await logout(() => navigate('/', { replace: true })) }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to sign out.') }
    finally { setBusy(false) }
  }
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <Brand /><span className="nav-caption">YOUR READING SPACE</span>
      <nav aria-label="Main navigation">{links.map(({ to, label, icon: Icon, end }) =>
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Icon size={20} /><span>{label}</span>
        </NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="reading-note"><span className="note-dot" /><p>A little reading.<br />A little more possibility.</p></div>
        <div className="sidebar-version"><span>IPT102 · Phase 1</span><span>v0.1</span></div>
      </div>
    </aside>
    <div className="app-main">
      <header className="app-header">
        <div className="mobile-brand"><Brand /></div>
        <div className="header-breadcrumb">Your library <span>/</span> <strong>A space to discover</strong></div>
        <div className="header-actions"><ThemeToggle /><span className="header-divider" />
          <div className="account-avatar"><UserRound size={18} /></div>
          <span className="account-name">{guest ? 'Guest reader' : profile?.user?.full_name.split(' ')[0]}</span>
          <button className="icon-button" onClick={signOut} disabled={busy} aria-label={guest ? 'End guest session' : 'Sign out'}><LogOut size={18} /></button>
        </div>
      </header>
      {error && <div className="inline-error" role="alert">{error}</div>}
      {guest && <div className="guest-banner"><span><span className="status-dot" />You’re exploring as a guest.</span>
        <span className="guest-allowance">{profile?.downloads_remaining ?? 5} books remaining in tracking demo</span>
        <NavLink to="/register">Create your free account <span aria-hidden="true">↗</span></NavLink>
      </div>}
      {!native && profile?.user?.role === 'admin' && <div className="admin-access"><NavLink className="text-link" to="/app/admin">Administration</NavLink></div>}
      <main id="main-content" className="page-content" tabIndex={-1}><Outlet /></main>
      <footer className="app-footer"><span>A new chapter starts with curiosity.</span><span>Created by shio del rio · E-Library AI</span></footer>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{links.map(({ to, label, icon: Icon, end }) =>
      <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={20} /><span>{label === 'Explore books' ? 'Explore' : label === 'AI Assistant' ? 'Assistant' : label}</span></NavLink>
    )}</nav>
  </div>
}
