import { ArrowLeft, ArrowRight, ExternalLink, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCategories, useResource } from '../hooks/useCatalog'
import { BookCard, BookSkeletons, ErrorState } from '../components/ui'
import { native } from '../lib/api'
import { resourceKinds } from '../types'
import type { BookPage, ListingKind, ResourcePage } from '../types'

export function Explore() {
  const [params, setParams] = useSearchParams()
  const resources = params.get('view') === 'resources'
  const query = params.get('q') || ''
  const category = params.get('category') || ''
  const access = params.get('access_type')
  const accessType = access === 'paid' || access === 'free_to_read' ? access : ''
  const sort = accessType === 'paid' && params.get('sort') === 'price_asc' ? 'price_asc' : ''
  const kind = resourceKinds.find(value => value === params.get('kind')) || ''
  const rawOffset = Number(params.get('offset'))
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0
  const [draft, setDraft] = useState(query)
  useEffect(() => setDraft(query), [query])

  const request = new URLSearchParams({ q: query, limit: '12', offset: String(offset) })
  if (category) request.set('category', category)
  if (resources && kind) request.set('kind', kind)
  if (!resources && accessType) request.set('access_type', accessType)
  if (!resources && sort) request.set('sort', sort)

  const books = useResource<BookPage>(resources ? null : `/books?${request}`)
  const links = useResource<ResourcePage>(resources ? `/resources?${request}` : null)
  const categories = useCategories()
  const { data, error, loading, retry } = resources ? links : books
  const categoryNames = resources ? links.data?.categories || [] : categories.data?.map(item => item.name) || []
  const visibleCategories = category && !categoryNames.includes(category) ? [...categoryNames, category] : categoryNames

  function update(key: string, value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value); else next.delete(key)
      if (key !== 'offset') next.delete('offset')
      if (key === 'access_type' && value !== 'paid') next.delete('sort')
      return next
    })
  }
  function changeView(next: 'books' | 'resources') {
    if (resources === (next === 'resources')) return
    const nextParams = new URLSearchParams()
    if (query) nextParams.set('q', query)
    if (next === 'resources') nextParams.set('view', 'resources')
    setParams(nextParams)
  }
  function submit(event: FormEvent) { event.preventDefault(); update('q', draft.trim()) }

  return <>
    <div className="page-heading"><div><h1>Explore the collection<span className="heading-dot">.</span></h1><p>Find programming books and learning resources.</p></div>
      {!native && <Link className="button secondary small" to="/app/submissions">Submit a listing</Link>}</div>
    <div className="catalog-views" role="group" aria-label="Catalog view">
      <button className={`button ${!resources ? 'primary' : 'secondary'} small`} aria-pressed={!resources} onClick={() => changeView('books')}>Books</button>
      <button className={`button ${resources ? 'primary' : 'secondary'} small`} aria-pressed={resources} onClick={() => changeView('resources')}>Resources</button>
    </div>
    <form className="search-bar" onSubmit={submit} role="search"><Search size={21} /><input type="search" aria-label={resources ? 'Search resources' : 'Search books'} placeholder="Title, author, or topic" maxLength={150} value={draft} onChange={event => setDraft(event.target.value)} /><button className="button primary small">Search <ArrowRight size={16} /></button></form>
    <div className="catalog-toolbar">
      <div className="filter-control"><SlidersHorizontal size={17} /><label htmlFor="category">Category</label><select id="category" value={category} onChange={event => update('category', event.target.value)}><option value="">All categories</option>{visibleCategories.map(name => <option key={name}>{name}</option>)}</select></div>
      {resources ? <div className="filter-control"><label htmlFor="resource-kind">Type</label><select id="resource-kind" value={kind} onChange={event => update('kind', event.target.value)}><option value="">All types</option>{resourceKinds.map(value => <option value={value} key={value}>{resourceLabel(value)}</option>)}</select></div>
        : <><div className="filter-control"><label htmlFor="book-access">Access</label><select id="book-access" value={accessType} onChange={event => update('access_type', event.target.value)}><option value="">All books</option><option value="free_to_read">Free only</option><option value="paid">Paid only</option></select></div>
          {accessType === 'paid' && <div className="filter-control"><label htmlFor="book-sort">Sort</label><select id="book-sort" value={sort} onChange={event => update('sort', event.target.value)}><option value="">Default</option><option value="price_asc">Price: Low to high</option></select></div>}</>}
      <span className="muted" aria-live="polite">{loading ? 'Searching…' : data ? `${data.total} ${resources ? 'resources' : data.total === 1 ? 'book' : 'books'} to discover` : ''}</span>
    </div>
    {!resources && categories.error && <ErrorState message={categories.error} retry={categories.retry} />}
    {loading ? <BookSkeletons count={4} /> : error ? <ErrorState message={error} retry={retry} />
      : data?.items.length ? resources
        ? <div className="resource-grid">{links.data?.items.map(link => <article className="resource-card" key={link.id}>
          <p className="eyebrow">{resourceLabel(link.kind)} · {link.category}</p>
          <h2>{link.title}</h2><p className="muted">{link.author} · {link.access_type === 'paid' ? 'Paid at source' : 'Free at source'}</p>
          <p>{link.description}</p>
          <a className="text-link" href={link.source_url} target="_blank" rel="noopener noreferrer">Open at source <ExternalLink size={15} /></a>
        </article>)}</div>
        : <div className="book-grid explore-grid">{books.data?.items.map(book => <BookCard book={book} key={book.id} />)}</div>
      : <div className="empty-state"><Search size={35} /><h2>No {resources ? 'resources' : 'books'} found.</h2><p>Try a different search or clear the filters.</p><button className="button secondary" onClick={() => { setParams(resources ? { view: 'resources' } : {}); setDraft('') }}>Clear filters</button></div>}
    {data && (data.total > 12 || offset > 0) && <div className="pagination"><button className="button secondary" disabled={offset === 0} onClick={() => update('offset', String(Math.max(0, offset - 12)))}><ArrowLeft size={16} />Previous</button><span>Page {Math.floor(offset / 12) + 1}</span><button className="button secondary" disabled={offset + 12 >= data.total} onClick={() => update('offset', String(offset + 12))}>Next<ArrowRight size={16} /></button></div>}
    {!resources && <p className="collection-disclosure">Free online editions and paid publisher listings are labeled separately. Publisher purchases and reading happen at the linked source.</p>}
  </>
}

function resourceLabel(kind: ListingKind) {
  return kind.charAt(0).toUpperCase() + kind.slice(1)
}
