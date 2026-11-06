import { ArrowRight, BookOpen, Compass, Layers3, Search, ShieldCheck, Smartphone } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useBooks, useCategories } from '../hooks/useCatalog'
import { native } from '../lib/api'
import { BookCard, BookSkeletons, Brand, Cover, ErrorState, LoadingPage, Spinner, ThemeToggle } from '../components/ui'

export function Landing() {
  const { guest, profile, loading: checkingSession, connectionError, refresh } = useAuth()
  const { data, loading, error, retry } = useBooks('limit=4')
  const categories = useCategories()
  const [busy, setBusy] = useState(false)
  const [guestError, setGuestError] = useState('')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  async function enterGuest() {
    setBusy(true); setGuestError('')
    try { await guest(); navigate('/app') }
    catch (error) { setGuestError(error instanceof Error ? error.message : 'Unable to start a guest session.') }
    finally { setBusy(false) }
  }
  function searchCatalog(event: FormEvent) {
    event.preventDefault()
    navigate(`/app/explore?q=${encodeURIComponent(query.trim())}`)
  }
  if (native) {
    if (checkingSession) return <LoadingPage />
    if (connectionError) return <ErrorState message={connectionError} retry={() => void refresh()} />
    if (profile) return <Navigate to="/app" replace />
  }
  return <div className="landing">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="landing-header"><Brand /><nav aria-label="Welcome navigation">
      <a href="#collection" className="collection-link">The collection</a><ThemeToggle />
      <Link className="text-link" to="/login" state={location.state}>Log in</Link>
      <Link className="button primary small" to="/register" state={location.state}>Get started <ArrowRight size={16} /></Link>
    </nav></header>
    <main id="main-content">
      <section className="landing-hero">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="hero-copy">
          <span className="pill"><span className="status-dot" />A space for curious minds</span>
          <h1>Your next chapter<br />starts <em>here.</em></h1>
          <p>Rust first. Practical programming. Better software.<br className="desktop-break" /> Build your skills, one book at a time.</p>
          <form className="landing-search" role="search" onSubmit={searchCatalog}>
            <Search size={20} /><input aria-label="Search the collection" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, author, or language…" maxLength={150} />
            <button className="button primary small" type="submit">Search library</button>
          </form>
          {categories.data?.length ? <div className="landing-category-chips" aria-label="Popular categories">{categories.data.slice(0, 6).map(category => <Link key={category.name} to={`/app/explore?category=${encodeURIComponent(category.name)}`}>{category.name}</Link>)}</div> : null}
          <div className="hero-actions"><Link to={profile ? '/app' : '/register'} state={location.state} className="button primary">{profile ? 'Open your library' : 'Find your next read'} <ArrowRight size={18} /></Link>
            {!profile && <button className="button secondary" onClick={enterGuest} disabled={busy}>{busy ? <Spinner /> : <Compass size={18} />}Continue as Guest</button>}
          </div>
          {guestError && <p className="form-error" role="alert">{guestError}</p>}
          <div className="hero-assurance"><ShieldCheck size={15} />Free to explore. Built for learning.</div>
        </motion.div>
        <div className="hero-visual" aria-label="A preview of our programming book collection">
          <div className="visual-ring ring-one" /><div className="visual-ring ring-two" />
          {data?.items.slice(0, 3).map((book, index) => <div className={`floating-book floating-${index}`} key={book.id}><Cover book={book} /></div>)}
          {(!data || data.items.length === 0) && <div className="visual-placeholder"><BookOpen size={84} strokeWidth={1} /><span>A world of ideas awaits.</span></div>}
          <div className="floating-note"><span className="note-icon"><BookOpen size={20} /></span><span>Less scrolling.<br /><strong>More discovering.</strong></span></div>
          <span className="visual-caption">ONE GOOD BOOK CAN CHANGE YOUR PERSPECTIVE.</span>
        </div>
      </section>
      <motion.section className="benefits" aria-label="Platform benefits" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}>
        <div><BookOpen size={22} /><span><strong>Programming worth your time</strong><small>Author editions and official publisher listings</small></span></div>
        <div><Smartphone size={22} /><span><strong>Your library, anywhere</strong><small>One account for web and Android</small></span></div>
        <div><Layers3 size={22} /><span><strong>Rust at the center</strong><small>Python, JavaScript, Go, C++, and more</small></span></div>
      </motion.section>
      <motion.section id="collection" className="landing-collection" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18 }}>
        <div className="section-heading"><div><span className="eyebrow">THE PROGRAMMING COLLECTION</span><h2>Build something worth reading about.</h2><p>Rust leads the collection, alongside other programming languages and software engineering.</p></div><Link to="/app/explore" className="text-link">Explore the collection <ArrowRight size={17} /></Link></div>
        {loading ? <BookSkeletons /> : error ? <ErrorState message={error} retry={retry} /> : data && data.items.length > 0 ? <div className="book-grid">{data.items.map(book => <BookCard key={book.id} book={book} />)}</div> : <p className="muted">The collection is being prepared. Check back soon.</p>}
        <p className="collection-disclosure">{data ? `${data.total} programming titles` : 'Programming books'} · Free online editions and paid publisher listings are labeled separately.</p>
      </motion.section>
      <section className="landing-cta"><span className="eyebrow">MAKE SPACE FOR SOMETHING NEW</span><h2>Every great idea starts<br />with a little curiosity.</h2><Link to="/register" className="button primary">Start your next chapter <ArrowRight size={18} /></Link></section>
    </main>
    <footer className="landing-footer"><Brand /><span>Made for learning. Built with curiosity.</span><span>Created by shio del rio · IPT102 · Phase 1 · 2026</span></footer>
  </div>
}
