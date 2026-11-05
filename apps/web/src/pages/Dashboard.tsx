import { ArrowRight, BookOpen, Compass, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBooks, useCategories } from '../hooks/useCatalog'
import { BookCard, BookSkeletons, Cover, ErrorState } from '../components/ui'

export function Dashboard() {
  const { profile } = useAuth()
  const { data, error, loading, retry } = useBooks('limit=4')
  const categories = useCategories()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const name = profile?.user?.full_name.split(' ')[0] || 'curious reader'
  function findBooks(event: FormEvent) {
    event.preventDefault()
    navigate(`/app/explore?q=${encodeURIComponent(search.trim())}`)
  }
  return <>
    {location.state?.notice && <div className="success-notice" role="status">{location.state.notice}</div>}
    <div className="page-heading"><div><span className="eyebrow">YOUR DAILY DOSE OF DISCOVERY</span><h1>Hello, {name}<span className="heading-dot">.</span></h1><p>A good day to find your next great read.</p></div><span className="phase-badge"><span className="status-dot" />Phase 1 · Open collection</span></div>
    <form className="search-bar" role="search" onSubmit={findBooks}><Search size={21} /><input aria-label="Search the library" placeholder="Search by title, author, or a little curiosity…" value={search} onChange={event => setSearch(event.target.value)} maxLength={150} /><button className="button primary small" type="submit">Search <ArrowRight size={16} /></button></form>
    <section className="discovery-hero"><div><span className="hero-tag">BUILD YOUR NEXT CHAPTER</span><h2>A little curiosity.<br />Better software.</h2><p>Start with Rust. Explore another language.<br />Find your next programming book.</p><Link to="/app/explore" className="button light">Explore the collection <ArrowRight size={18} /></Link></div>
      <div className="discovery-art" aria-hidden="true"><span className="hero-orbit" />{data?.items.slice(0, 2).map((book, index) => <div key={book.id} className={`hero-book hero-book-${index}`}><Cover book={book} /></div>)}{!data && <BookOpen size={125} strokeWidth={0.7} />}</div>
    </section>
    <section className="category-section"><div className="section-heading"><div><span className="eyebrow">FOLLOW YOUR INTERESTS</span><h2>Browse by category</h2></div><Link to="/app/explore" className="text-link">View all <ArrowRight size={16} /></Link></div>
      {categories.error ? <ErrorState message={categories.error} retry={categories.retry} /> : <div className="category-grid">{categories.loading ? <span className="skeleton category-skeleton" role="status" aria-label="Loading categories" /> : categories.data?.map((category, index) => <Link key={category.name} to={`/app/explore?category=${encodeURIComponent(category.name)}`} className={`category-card category-${index % 4}`}><span className="category-icon">{index % 2 ? <Compass size={22} /> : <BookOpen size={22} />}</span><div><h3>{category.name}</h3><span>{category.count} {category.count === 1 ? 'book' : 'books'}</span></div><ArrowRight size={17} /></Link>)}</div>}
    </section>
    <section><div className="section-heading"><div><span className="eyebrow">A PLACE TO START</span><h2>On the reading list</h2></div><Link to="/app/explore" className="text-link">All books <ArrowRight size={16} /></Link></div>{loading ? <BookSkeletons /> : error ? <ErrorState message={error} retry={retry} /> : data?.items.length ? <div className="book-grid">{data.items.map(book => <BookCard key={book.id} book={book} />)}</div> : <div className="empty-inline">No books yet. The library collection is being prepared.</div>}</section>
    <section className="assistant-teaser"><span className="teaser-icon"><Sparkles size={25} /></span><div><span className="eyebrow">A LITTLE HELP FINDING YOUR NEXT READ</span><h3>Find a book with your library assistant.</h3><p>Search the real catalog and ask follow-up questions. AI availability is shown in the chat.</p></div><Link to="/app/assistant" className="button secondary">Open assistant <ArrowRight size={16} /></Link></section>
  </>
}
