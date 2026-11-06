import { Compass, Heart, Home, LayoutDashboard, LibraryBig, LogOut, PanelLeftClose, PanelLeftOpen, Sparkles, UserRound } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { Brand, ThemeToggle } from './ui'
import { native } from '../lib/api'

const links = [
  { to: '/app', label: 'Overview', icon: Home, end: true },
  { to: '/app/explore', label: 'Explore books', icon: Compass },
  { to: '/app/library', label: 'My Library', icon: LibraryBig },
  { to: '/app/favorites', label: 'Favorites', icon: Heart },
  { to: '/app/assistant', label: 'AI Assistant', icon: Sparkles },
]
export function AppLayout() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const guest = profile?.session_type === 'guest'
  const section = location.pathname.includes('/explore') ? 'Explore books'
    : location.pathname.includes('/library') ? 'My Library'
      : location.pathname.includes('/favorites') ? 'Favorites'
        : location.pathname.includes('/assistant') ? 'AI Assistant'
          : location.pathname.includes('/admin') ? 'Administration' : location.pathname.includes('/books/') ? 'Book details' : 'Overview'
  async function signOut() {
    setBusy(true)
    try { await logout(() => navigate('/', { replace: true })) }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to sign out.') }
    finally { setBusy(false) }
  }
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <div className="sidebar-brand-row"><Brand /><button className="icon-button sidebar-toggle" onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div><span className="nav-caption">YOUR READING SPACE</span>
      <nav aria-label="Main navigation">{links.map(({ to, label, icon: Icon, end }) =>
        <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Icon size={20} /><span>{label}</span><i className="nav-indicator" aria-hidden="true" />
        </NavLink>)}{!native && profile?.user?.role === 'admin' && <NavLink to="/app/admin" aria-label="Administration" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><LayoutDashboard size={20} /><span>Administration</span><i className="nav-indicator" aria-hidden="true" /></NavLink>}</nav>
      <div className="sidebar-bottom">
        <div className="reading-note"><span className="note-dot" /><p>A little reading.<br />A little more possibility.</p></div>
        <div className="sidebar-version"><span>IPT102 · Phase 1</span><span>v0.1</span></div>
      </div>
    </aside>
    <div className="app-main">
      <header className="app-header">
        <div className="mobile-brand"><Brand /></div>
        <div className="header-breadcrumb"><span className="header-kicker">Your library</span><strong>{section}</strong></div>
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
      <motion.main id="main-content" className="page-content" tabIndex={-1} key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18, ease: [0.22, 1, 0.36, 1] }}><Outlet /></motion.main>
      <footer className="app-footer"><span>A new chapter starts with curiosity.</span><span>Created by shio del rio · E-Library AI</span></footer>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{links.map(({ to, label, icon: Icon, end }) =>
      <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={20} /><span>{label === 'Explore books' ? 'Explore' : label === 'AI Assistant' ? 'Assistant' : label}</span></NavLink>
    )}</nav>
    {!location.pathname.includes('/assistant') && <NavLink to="/app/assistant" className="assistant-launcher" aria-label="Open AI Assistant"><Sparkles size={19} /><span>Ask the library</span></NavLink>}
  </div>
}
