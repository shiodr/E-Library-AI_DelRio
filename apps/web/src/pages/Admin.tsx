import { Archive, ArrowLeft, ArrowRight, BookOpen, CheckCircle, Download, ExternalLink, Pencil, Plus, RefreshCw, RotateCcw, Search, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorState, Spinner } from '../components/ui'
import { useResource } from '../hooks/useCatalog'
import { api, post } from '../lib/api'
import type { Book, BookPage, Category } from '../types'
import './admin.css'

interface Overview {
  total_books: number
  active_books: number
  archived_books: number
  registered_users: number
  total_downloads: number
  categories: Category[]
  recent_books: Book[]
  recent_downloads: { id: string; book: Book; downloaded_at: string; owner_type: 'registered' | 'guest' }[]
}

interface BookForm {
  title: string
  author: string
  category: string
  description: string
  cover_url: string
  source_url: string
  license_type: string
  access_type: 'free_to_read' | 'paid'
}

const emptyForm: BookForm = {
  title: '', author: '', category: '', description: '', cover_url: '', source_url: '', license_type: '', access_type: 'free_to_read',
}

function readableDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function secureUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password && !/[\s\x00-\x1f]/.test(value)
  } catch { return false }
}

export function Admin() {
  const [query, setQuery] = useState('')
  const [draftQuery, setDraftQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('all')
  const [offset, setOffset] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Book | null>(null)
  const [form, setForm] = useState<BookForm>({ ...emptyForm })
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [confirmation, setConfirmation] = useState<{ book: Book; action: 'archive' | 'restore' } | null>(null)
  const formTitle = useRef<HTMLInputElement>(null)
  const editor = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const writing = useRef(false)
  const request = new URLSearchParams({ q: query, status, limit: '12', offset: String(offset) })
  if (category) request.set('category', category)
  const overview = useResource<Overview>('/admin/overview')
  const books = useResource<BookPage>(`/admin/books?${request}`)

  useEffect(() => {
    if (!formOpen) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    editor.current?.scrollIntoView?.({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' })
    formTitle.current?.focus({ preventScroll: true })
  }, [formOpen, editing?.id])

  useEffect(() => {
    const element = dialog.current
    if (!confirmation || !element) return
    if (typeof element.showModal === 'function') element.showModal()
    else element.setAttribute('open', '')
    return () => {
      if (typeof element.close === 'function') element.close()
      else element.removeAttribute('open')
    }
  }, [confirmation])

  function refresh() { overview.retry(); books.retry() }

  function openForm(book: Book | null) {
    if (writing.current) return
    setEditing(book)
    setForm(book ? {
      title: book.title, author: book.author, category: book.category, description: book.description,
      cover_url: book.cover_url || '', source_url: book.source_url, license_type: book.license_type,
      access_type: book.access_type || 'free_to_read',
    } : { ...emptyForm })
    setFormError('')
    setActionError('')
    setNotice('')
    setFormOpen(true)
  }

  function update(field: keyof BookForm, value: string) {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  async function saveBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (writing.current) return
    const values: BookForm = {
      title: form.title.trim(), author: form.author.trim(), category: form.category.trim(),
      description: form.description.trim(), source_url: form.source_url.trim(),
      cover_url: form.cover_url.trim(), license_type: form.license_type.trim(), access_type: form.access_type,
    }
    if ([values.title, values.author, values.category, values.description, values.source_url, values.license_type].some(value => !value)) {
      setFormError('Title, author, category, description, source URL, and access terms are required.')
      return
    }
    if (!secureUrl(values.source_url) || (values.cover_url && !secureUrl(values.cover_url))) {
      setFormError('Source and cover URLs must use HTTPS without embedded credentials.')
      return
    }
    writing.current = true
    setPending(true)
    setFormError('')
    setActionError('')
    setNotice('')
    const data = { ...values, cover_url: values.cover_url || null }
    try {
      const book = editing
        ? await api<Book>(`/admin/books/${editing.id}`, { method: 'PUT', body: JSON.stringify(data) })
        : await post<Book>('/admin/books', data)
      setNotice(`${editing ? 'Updated' : 'Added'} “${book.title}”.`)
      setFormOpen(false)
      setEditing(null)
      refresh()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save this book. Please try again.')
    } finally {
      writing.current = false
      setPending(false)
    }
  }

  async function changeVisibility() {
    if (!confirmation || writing.current) return
    writing.current = true
    setPending(true)
    setActionError('')
    setNotice('')
    try {
      const book = await post<Book>(`/admin/books/${confirmation.book.id}/${confirmation.action}`)
      setNotice(`${confirmation.action === 'archive' ? 'Archived' : 'Restored'} “${book.title}”.`)
      setConfirmation(null)
      refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to change this book. Please try again.')
    } finally {
      writing.current = false
      setPending(false)
    }
  }

  function search(event: FormEvent) { event.preventDefault(); setQuery(draftQuery.trim()); setOffset(0) }

  const metrics = overview.data ? [
    { label: 'Total books', value: overview.data.total_books, icon: BookOpen },
    { label: 'Active books', value: overview.data.active_books, icon: CheckCircle },
    { label: 'Archived books', value: overview.data.archived_books, icon: Archive },
    { label: 'Registered users', value: overview.data.registered_users, icon: Users },
    { label: 'Recorded downloads', value: overview.data.total_downloads, icon: Download },
  ] : []

  return <div className="catalog-admin">
    <div className="page-heading"><div><span className="eyebrow">CATALOG ADMINISTRATION</span>
      <h1>Administrator dashboard<span className="heading-dot">.</span></h1>
      <p>Manage the shared catalog used by the website and Android application.</p>
    </div><span className="admin-access-label"><ShieldCheck size={16} />Administrator access</span></div>

    <div className="admin-toolbar"><a className="text-link" href="#manage-books">Manage books <ArrowRight size={15} /></a>
      <button className="button secondary small" onClick={refresh} disabled={pending || overview.loading || books.loading}><RefreshCw size={15} />Refresh data</button>
    </div>
    {notice && <p className="admin-success" role="status"><CheckCircle size={17} />{notice}</p>}
    {actionError && !confirmation && <ErrorState message={actionError} />}
    {overview.loading ? <div className="admin-overview-loading" role="status"><Spinner />Loading database statistics…</div>
      : overview.error ? <ErrorState message={overview.error} retry={overview.retry} />
        : <div className="admin-metrics">{metrics.map(({ label, value, icon: Icon }) => <article className="admin-metric" key={label}>
          <Icon size={20} /><span>{label}</span><strong>{value.toLocaleString()}</strong>
        </article>)}</div>}
    <p className="admin-tracking-disclosure">Download figures count tracked requests, including demonstration requests. They do not represent delivered book files.</p>

    <section className="admin-management" id="manage-books" aria-labelledby="manage-books-title">
      <div className="admin-section-heading"><div><h2 id="manage-books-title">Book management</h2><p>Add, edit, archive, or restore catalog records. Existing history is preserved.</p></div>
        <button className="button primary small" onClick={() => openForm(null)} disabled={pending}><Plus size={16} />Add book</button>
      </div>

      {formOpen && <section className="admin-book-editor" ref={editor} aria-labelledby="book-editor-title">
        <div className="admin-editor-heading"><h3 id="book-editor-title">{editing ? 'Edit book' : 'Add book'}</h3>
          <button className="text-link" disabled={pending} onClick={() => { setFormOpen(false); setFormError('') }}>Cancel editing</button></div>
        {editing && <p className="admin-editor-note">Editing preserves this book’s identifier and existing download history.</p>}
        <form onSubmit={saveBook}>
          <fieldset disabled={pending} className="admin-form-fields"><legend className="sr-only">Book information</legend>
            <div className="field"><label htmlFor="admin-book-title">Title</label><input ref={formTitle} id="admin-book-title" value={form.title} onChange={event => update('title', event.target.value)} required maxLength={255} /></div>
            <div className="field"><label htmlFor="admin-book-author">Author</label><input id="admin-book-author" value={form.author} onChange={event => update('author', event.target.value)} required maxLength={255} /></div>
            <div className="field"><label htmlFor="admin-book-category">Category</label><input id="admin-book-category" value={form.category} onChange={event => update('category', event.target.value)} required maxLength={80} list="admin-category-options" /><datalist id="admin-category-options">{overview.data?.categories.map(item => <option key={item.name} value={item.name} />)}</datalist></div>
            <div className="field"><label htmlFor="admin-book-access">Access type</label><select id="admin-book-access" value={form.access_type} onChange={event => update('access_type', event.target.value)}><option value="free_to_read">Free online edition</option><option value="paid">Paid publisher listing</option></select></div>
            <div className="field admin-form-wide"><label htmlFor="admin-book-description">Description</label><textarea id="admin-book-description" value={form.description} onChange={event => update('description', event.target.value)} required maxLength={10000} rows={4} /></div>
            <div className="field admin-form-wide"><label htmlFor="admin-book-source">Authorized source URL</label><input id="admin-book-source" type="url" placeholder="https://" value={form.source_url} onChange={event => update('source_url', event.target.value)} required maxLength={500} /><small className="muted">Link to the author, project, or authorized publisher.</small></div>
            <div className="field admin-form-wide"><label htmlFor="admin-book-license">License and access terms</label><input id="admin-book-license" value={form.license_type} onChange={event => update('license_type', event.target.value)} required maxLength={255} /></div>
            <div className="field admin-form-wide"><label htmlFor="admin-book-cover">Cover image URL (optional)</label><input id="admin-book-cover" type="url" placeholder="https://" value={form.cover_url} onChange={event => update('cover_url', event.target.value)} maxLength={500} /><small className="muted">Use only artwork you have permission to display. Leave blank for the existing generated cover.</small></div>
          </fieldset>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="admin-form-actions"><button className="button primary" disabled={pending}>{pending ? <Spinner /> : <CheckCircle size={17} />}{pending ? 'Saving book…' : editing ? 'Save changes' : 'Create book'}</button>
            <button type="button" className="button secondary" disabled={pending} onClick={() => setFormOpen(false)}>Cancel</button></div>
        </form>
      </section>}

      <form className="admin-search" role="search" aria-label="Managed books" onSubmit={search}><Search size={18} /><input aria-label="Search managed books" value={draftQuery} onChange={event => setDraftQuery(event.target.value)} placeholder="Title, author, or category" maxLength={150} /><button className="button primary small">Search books</button></form>
      <div className="admin-filters"><div><label htmlFor="admin-status-filter">Book status</label><select id="admin-status-filter" value={status} onChange={event => { setStatus(event.target.value); setOffset(0) }}><option value="all">All books</option><option value="active">Active</option><option value="archived">Archived</option></select></div>
        <div><label htmlFor="admin-category-filter">Category</label><select id="admin-category-filter" value={category} onChange={event => { setCategory(event.target.value); setOffset(0) }}><option value="">All categories</option>{overview.data?.categories.map(item => <option key={item.name}>{item.name}</option>)}</select></div>
        <span className="muted" aria-live="polite">{books.data ? `${books.data.total} matching records` : books.loading ? 'Loading records…' : ''}</span>
      </div>
      {books.loading ? <div className="admin-overview-loading" role="status"><Spinner />Loading catalog records…</div>
        : books.error ? <ErrorState message={books.error} retry={books.retry} />
          : books.data?.items.length ? <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Managed book records"><table className="admin-book-table"><caption className="sr-only">Managed catalog books and available actions</caption>
            <thead><tr><th scope="col">Book</th><th scope="col">Category</th><th scope="col">Access</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
            <tbody>{books.data.items.map(book => <tr key={book.id}><td><strong>{book.title}</strong><small>{book.author}</small><a href={book.source_url} target="_blank" rel="noopener noreferrer" className="admin-source-link">Authorized source <ExternalLink size={12} /></a></td>
              <td>{book.category}</td><td>{book.access_type === 'paid' ? 'Paid listing' : 'Free edition'}</td>
              <td><span className={`admin-book-status ${book.is_active === false ? 'archived' : ''}`}>{book.is_active === false ? 'Archived' : 'Active'}</span></td>
              <td><div className="admin-row-actions"><button className="button secondary small" aria-label={`Edit ${book.title}`} onClick={() => openForm(book)} disabled={pending}><Pencil size={14} />Edit</button>
                <button className="button secondary small" aria-label={`${book.is_active === false ? 'Restore' : 'Archive'} ${book.title}`} disabled={pending} onClick={() => { setActionError(''); setConfirmation({ book, action: book.is_active === false ? 'restore' : 'archive' }) }}>{book.is_active === false ? <RotateCcw size={14} /> : <Archive size={14} />}{book.is_active === false ? 'Restore' : 'Archive'}</button></div></td>
            </tr>)}</tbody></table></div>
            : <div className="admin-empty"><BookOpen size={29} /><h3>No matching books</h3><p>Try another search or filter, or add a catalog record.</p><button className="button secondary small" onClick={() => { setQuery(''); setDraftQuery(''); setCategory(''); setStatus('all'); setOffset(0) }}>Clear filters</button></div>}
      {books.data && (books.data.total > 12 || offset > 0) && <div className="pagination"><button className="button secondary" disabled={offset === 0 || pending} onClick={() => setOffset(previous => Math.max(0, previous - 12))}><ArrowLeft size={16} />Previous</button><span>Page {Math.floor(offset / 12) + 1}</span><button className="button secondary" disabled={offset + 12 >= books.data.total || pending} onClick={() => setOffset(previous => previous + 12)}>Next<ArrowRight size={16} /></button></div>}
    </section>

    {overview.data && <div className="admin-activity-grid">
      <section className="admin-activity" aria-labelledby="recent-additions-title"><h2 id="recent-additions-title">Recent additions</h2>{overview.data.recent_books.length ? <ul>{overview.data.recent_books.map(book => <li key={book.id}><div><strong>{book.title}</strong><span>{book.author}</span></div><small>{book.is_active === false ? 'Archived' : 'Active'}</small></li>)}</ul> : <p className="muted">No catalog additions yet.</p>}</section>
      <section className="admin-activity" aria-labelledby="recent-downloads-title"><h2 id="recent-downloads-title">Recent download tracking</h2><p className="admin-activity-description">Requests recorded by the shared API, including the tracking demonstration.</p>{overview.data.recent_downloads.length ? <ul>{overview.data.recent_downloads.map(item => <li key={item.id}><div><strong>{item.book.title}</strong><span>{item.owner_type === 'guest' ? 'Guest session' : 'Registered account'} · {readableDate(item.downloaded_at)}</span></div><Download size={16} /></li>)}</ul> : <p className="muted">No download requests have been recorded.</p>}</section>
      <section className="admin-activity admin-category-overview" aria-labelledby="admin-categories-title"><h2 id="admin-categories-title">Catalog categories</h2><p className="admin-activity-description">Counts include active and archived books.</p><div className="admin-category-list">{overview.data.categories.map(item => <button key={item.name} onClick={() => { setCategory(item.name); setOffset(0); document.getElementById('manage-books')?.scrollIntoView?.({ block: 'start' }) }}>{item.name}<span>{item.count}</span></button>)}</div>{!overview.data.categories.length && <p className="muted">No categories yet.</p>}</section>
    </div>}

    <dialog ref={dialog} className="admin-confirmation" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-description" onCancel={event => { if (writing.current) event.preventDefault(); else setConfirmation(null) }}>
      <h2 id="admin-confirm-title">{confirmation?.action === 'restore' ? 'Restore this book?' : 'Archive this book?'}</h2>
      <p id="admin-confirm-description">{confirmation?.action === 'restore' ? 'This book will appear in the public catalog and assistant search results again.' : 'This book will be hidden from the public catalog and assistant search results. Existing download history will be preserved.'}</p>
      <strong className="admin-confirm-book">{confirmation?.book.title}</strong>
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      <div className="admin-form-actions"><button className="button secondary" disabled={pending} onClick={() => setConfirmation(null)} autoFocus>Cancel</button><button className="button primary" disabled={pending} onClick={() => void changeVisibility()}>{pending && <Spinner />}{pending ? 'Saving…' : confirmation?.action === 'restore' ? 'Restore book' : 'Archive book'}</button></div>
    </dialog>
  </div>
}
