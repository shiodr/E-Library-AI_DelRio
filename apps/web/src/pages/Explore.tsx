import { ArrowLeft, ArrowRight, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBooks, useCategories } from '../hooks/useCatalog'
import { BookCard, BookSkeletons, ErrorState } from '../components/ui'

export function Explore() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const category = params.get('category') || ''
  const rawOffset = Number(params.get('offset'))
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0
  const [draft, setDraft] = useState(query)
  const request = new URLSearchParams({ q: query, limit: '12', offset: String(offset) })
  if (category) request.set('category', category)
  const { data, error, loading, retry } = useBooks(request.toString())
  const categories = useCategories()
  function update(key: string, value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value); else next.delete(key)
      if (key !== 'offset') next.delete('offset')
      return next
    })
  }
  function submit(event: FormEvent) { event.preventDefault(); update('q', draft.trim()) }
  return <>
    <div className="page-heading"><div><span className="eyebrow">FOLLOW YOUR CURIOSITY</span><h1>Explore the collection<span className="heading-dot">.</span></h1><p>Timeless reads. New ways of seeing the world.</p></div><span className="phase-badge">Phase 1 starter catalog</span></div>
    <form className="search-bar" onSubmit={submit} role="search"><Search size={21} /><input type="search" aria-label="Search books" placeholder="A title, an author, an idea…" maxLength={150} value={draft} onChange={event => setDraft(event.target.value)} /><button className="button primary small">Search <ArrowRight size={16} /></button></form>
    <div className="catalog-toolbar"><div className="filter-control"><SlidersHorizontal size={17} /><label htmlFor="category">Category</label><select id="category" value={category} onChange={event => update('category', event.target.value)}><option value="">All categories</option>{categories.data?.map(item => <option key={item.name}>{item.name}</option>)}</select></div><span className="muted" aria-live="polite">{loading ? 'Finding your next read…' : data ? `${data.total} ${data.total === 1 ? 'book' : 'books'} to discover` : ''}</span></div>
    {categories.error && <ErrorState message={categories.error} retry={categories.retry} />}
    {loading ? <BookSkeletons count={4} /> : error ? <ErrorState message={error} retry={retry} /> : data?.items.length ? <div className="book-grid explore-grid">{data.items.map(book => <BookCard book={book} key={book.id} />)}</div> : <div className="empty-state"><Search size={35} /><h2>No books found.</h2><p>Try a different title, author, or category.</p><button className="button secondary" onClick={() => { setParams({}); setDraft('') }}>Clear filters</button></div>}
    {data && (data.total > 12 || offset > 0) && <div className="pagination"><button className="button secondary" disabled={offset === 0} onClick={() => update('offset', String(Math.max(0, offset - 12)))}><ArrowLeft size={16} />Previous</button><span>Page {Math.floor(offset / 12) + 1}</span><button className="button secondary" disabled={offset + 12 >= data.total} onClick={() => update('offset', String(offset + 12))}>Next<ArrowRight size={16} /></button></div>}
    <p className="collection-disclosure">This is the initial sample collection. The 200-book catalog is planned for later phases.</p>
  </>
}
