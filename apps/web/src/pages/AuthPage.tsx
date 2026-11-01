import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brand, Spinner, ThemeToggle } from '../components/ui'

export function AuthPage({ register = false }: { register?: boolean }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const intended = typeof location.state?.from === 'string' && location.state.from.startsWith('/app')
    ? location.state.from : '/app'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    const name = String(form.get('full_name') || '').trim()
    const validation: Record<string, string> = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) validation.email = 'Enter a valid email address.'
    if (!password) validation.password = 'Enter your password.'
    if (register) {
      if (name.length < 2) validation.full_name = 'Enter your full name (at least 2 characters).'
      if (password.length < 12) validation.password = 'Use at least 12 characters.'
      if (password !== form.get('confirm')) validation.confirm = 'Passwords do not match.'
    }
    setFields(validation); setError('')
    if (Object.keys(validation).length) {
      const first = event.currentTarget.elements.namedItem(Object.keys(validation)[0])
      if (first instanceof HTMLElement) first.focus()
      return
    }
    setBusy(true)
    try {
      if (register) await auth.register(name, email, password)
      else await auth.login(email, password)
      navigate(intended, { replace: true, state: { notice: register ? 'Your account is ready. Welcome to your library.' : 'Welcome back. You’re signed in.' } })
    } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy(false) }
  }
  async function enterGuest() {
    setBusy(true); setError('')
    try { await auth.guest(); navigate(intended, { replace: true }) }
    catch (error) { setError(error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy(false) }
  }
  return <div className="auth-page"><header className="landing-header"><Brand /><ThemeToggle /></header>
    <main className="auth-main"><div className="auth-story"><span className="eyebrow">YOUR NEXT CHAPTER</span><h1>A quieter space.<br />A wider world.</h1><p>Find a new perspective in the pages of a good book.</p><div className="auth-illustration"><span>READ.<br /><em>Wonder.</em><br />REPEAT.</span></div><div className="hero-assurance"><ShieldCheck size={16} />One account. Web and Android.</div></div>
      <div className="auth-form-panel"><Link to="/" className="back-link"><ArrowLeft size={16} />Back to home</Link>
        <span className="eyebrow">{register ? 'BEGIN YOUR STORY' : 'GOOD TO SEE YOU AGAIN'}</span>
        <h2>{register ? 'Make yourself at home.' : 'Welcome back.'}</h2><p className="muted">{register ? 'Create an account for your own reading space.' : 'Sign in and pick up where curiosity takes you.'}</p>
        <form onSubmit={submit} noValidate aria-label={register ? 'Registration' : 'Login'}>
          {register && <div className="field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" autoComplete="name" maxLength={100} placeholder="Your full name" aria-invalid={!!fields.full_name} aria-describedby={fields.full_name ? 'full-name-error' : undefined} />{fields.full_name && <small id="full-name-error" className="field-error">{fields.full_name}</small>}</div>}
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="you@university.edu" aria-invalid={!!fields.email} aria-describedby={fields.email ? 'email-error' : undefined} />{fields.email && <small id="email-error" className="field-error">{fields.email}</small>}</div>
          <div className="field"><label htmlFor="password">Password</label><div className="password-input"><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} maxLength={128} placeholder={register ? 'At least 12 characters' : 'Your password'} aria-invalid={!!fields.password} aria-describedby={fields.password ? 'password-error' : register ? 'password-help' : undefined} /><button type="button" className="icon-button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{fields.password ? <small id="password-error" className="field-error">{fields.password}</small> : register && <small id="password-help" className="muted">Use 12–128 characters. A passphrase works well.</small>}</div>
          {register && <div className="field"><label htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" maxLength={128} placeholder="Enter your password again" aria-invalid={!!fields.confirm} aria-describedby={fields.confirm ? 'confirm-error' : undefined} />{fields.confirm && <small id="confirm-error" className="field-error">{fields.confirm}</small>}</div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary full-width" disabled={busy}>{busy ? <Spinner /> : <ArrowRight size={18} />}{busy ? 'Opening your library…' : register ? 'Create account' : 'Log in'}</button>
        </form>
        <p className="auth-switch">{register ? 'Already have an account?' : 'New around here?'} <Link to={register ? '/login' : '/register'} state={location.state}>{register ? 'Log in' : 'Create an account'}</Link></p>
        <div className="auth-separator"><span />or explore first<span /></div><button className="button secondary full-width" onClick={enterGuest} disabled={busy}>Continue as Guest <ArrowRight size={17} /></button>
      </div>
    </main><footer className="auth-footer">E-Library AI · A space for curious minds</footer>
  </div>
}
