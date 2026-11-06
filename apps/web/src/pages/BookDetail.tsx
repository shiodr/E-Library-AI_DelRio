import { ArrowLeft, ArrowRight, ExternalLink, Heart, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { post } from '../lib/api'
import { useResource } from '../hooks/useCatalog'
import type { Book, BookPage } from '../types'
import { BookCard, BookSkeletons, Cover, ErrorState, LoadingPage } from '../components/ui'

export function BookDetail() {
  const { id } = useParams()
  const { data: book, error, loading, retry } = useResource<Book>(`/books/${id}`)
  const related = useResource<BookPage>(book ? `/books?category=${encodeURIComponent(book.category)}&limit=5` : null)
  const { profile, refresh } = useAuth()
  const [pending, setPending] = useState('')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [lastAction, setLastAction] = useState<'favorite' | 'tracking'>('tracking')
  async function action(kind: 'favorite' | 'tracking') {
    if (!id) return
    setLastAction(kind)
    setPending(kind); setNotice(''); setActionError('')
    try {
      if (kind === 'favorite') { await post('/favorites', { book_id: id }); setNotice('Saved to your favorites.') }
      else {
        const result = await post<{ already_downloaded: boolean; allowance: { used: number; limit: number } }>('/downloads', { book_id: id })
        setNotice(`${result.already_downloaded ? 'Already recorded; allowance unchanged.' : 'Tracking demonstration recorded.'} ${result.allowance.used} of ${result.allowance.limit} tracked. No file was downloaded.`)
        await refresh(true)
      }
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Unable to complete this action.') }
    finally { setPending('') }
  }
  if (loading) return <LoadingPage />
  if (error) return <ErrorState message={error} retry={retry} />
  if (!book) return null
  const paid = book.access_type === 'paid'
  return <>
    <Link to="/app/explore" className="back-link"><ArrowLeft size={17} />Back to collection</Link>
    <article className="book-detail">
      <div className="detail-presentation"><div className="detail-cover"><Cover book={book} large /></div><span className="detail-format">{paid ? 'Official publisher listing' : 'Authorized online edition'}</span></div>
      <div className="detail-information">
        <span className="pill">{book.category}</span>
        <h1>{book.title}</h1><p className="detail-author">by {book.author}</p>
        <span className="eyebrow">{paid ? 'PAID PUBLISHER LISTING' : 'FREE ONLINE EDITION'}</span>
        <p className="detail-description">{book.description}</p>
        <dl className="detail-metadata"><div><dt>Written by</dt><dd>{book.author}</dd></div><div><dt>Category</dt><dd>{book.category}</dd></div><div><dt>Access</dt><dd>{paid ? 'Purchase through publisher' : 'Free to read at source'}</dd></div></dl>
        <div className="license-info"><ShieldCheck size={21} /><div>
          <strong>Source & access terms</strong><p>{book.license_type}</p>
          <a href={book.source_url} target="_blank" rel="noopener noreferrer" className="text-link">
            {paid ? 'View publisher listing' : 'Read at the authorized source'} <ExternalLink size={14} />
          </a>
        </div></div>
        <div className="book-actions">{profile?.session_type === 'user' ? <button className="button primary" disabled={!!pending} onClick={() => void action('favorite')}><Heart size={17} />Save to favorites</button> : <Link className="button primary" to="/register" state={{ from: `/app/books/${id}` }}><Heart size={17} />Register to save favorites</Link>}
          {!paid && <button className="button secondary" disabled={!!pending} onClick={() => void action('tracking')}>Record tracking demonstration</button>}</div>
        {notice && <p className="success-notice" role="status">{notice} <Link to={lastAction === 'favorite' ? '/app/favorites' : '/app/library'}>{lastAction === 'favorite' ? 'View favorites' : 'View My Library'}</Link></p>}
        {actionError && <ErrorState message={actionError} retry={() => void action(lastAction)} />}
        <p className="muted detail-note">{paid ? 'The linked publisher controls purchasing and access to this book.' : 'Read the online edition at its linked source. The tracking demonstration records a request only.'} In-app book-file delivery is not implemented.</p>
      </div>
    </article>
    <section className="related-books" aria-label="Related books"><div className="section-heading"><div><span className="eyebrow">KEEP YOUR CURIOSITY GOING</span><h2>More in {book.category}</h2></div><Link className="text-link" to={`/app/explore?category=${encodeURIComponent(book.category)}`}>Explore category <ArrowRight size={16} /></Link></div>
      {related.loading ? <BookSkeletons /> : related.error ? <ErrorState message={related.error} retry={related.retry} /> : related.data?.items.some(item => item.id !== book.id) ? <div className="book-grid">{related.data.items.filter(item => item.id !== book.id).slice(0, 4).map(item => <BookCard key={item.id} book={item} />)}</div> : <p className="muted">Explore the collection for more programming books.</p>}
    </section>
  </>
}
