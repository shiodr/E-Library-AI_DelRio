import { ArrowLeft, ArrowRight, ExternalLink, Heart, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { post } from '../lib/api'
import { originalPrice, priceLabel } from '../lib/prices'
import { saveBookFile } from '../lib/bookDownload'
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
  const [lastAction, setLastAction] = useState<'favorite' | 'download'>('download')
  async function action(kind: 'favorite' | 'download') {
    if (!id) return
    setLastAction(kind)
    setPending(kind); setNotice(''); setActionError('')
    try {
      if (kind === 'favorite') { await post('/favorites', { book_id: id }); setNotice('Saved to your favorites.') }
      else if (book?.download_filename) {
        try {
          const saved = await saveBookFile(id, book.download_filename)
          setNotice(saved ? 'PDF download ready.' : 'Save cancelled. You can download this title again without using another slot.')
        } finally {
          await refresh(true)
        }
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
        {paid && <div className="license-info publisher-price"><div>
          {book.price ? <>
            <strong>{priceLabel(book.price)} · {book.price.offer_format}</strong>
            {book.price.rate_date && <p>Publisher price {originalPrice(book.price)}. Peso estimate uses the <a className="text-link" href="https://www.bsp.gov.ph/SitePages/Statistics/ExchangeRate.aspx" target="_blank" rel="noopener noreferrer">BSP rate</a> dated {book.price.rate_date}.</p>}
            <p>Checked {book.price.checked_on}. Final price, taxes, and shipping are shown by the seller.</p>
            <a className="text-link" href={book.price.source_url} target="_blank" rel="noopener noreferrer">View price source <ExternalLink size={14} /></a>
          </> : <strong>Check price at publisher</strong>}
        </div></div>}
        <dl className="detail-metadata"><div><dt>Written by</dt><dd>{book.author}</dd></div><div><dt>Category</dt><dd>{book.category}</dd></div><div><dt>Access</dt><dd>{paid ? 'Purchase through publisher' : 'Free to read at source'}</dd></div></dl>
        <div className="license-info"><ShieldCheck size={21} /><div>
          <strong>Source & access terms</strong><p>{book.license_type}</p>
          <a href={book.source_url} target="_blank" rel="noopener noreferrer" className="text-link">
            {paid ? 'View publisher listing' : 'Read at the authorized source'} <ExternalLink size={14} />
          </a>
        </div></div>
        <div className="book-actions">{profile?.session_type === 'user' ? <button className="button primary" disabled={!!pending} onClick={() => void action('favorite')}><Heart size={17} />Save to favorites</button> : <Link className="button primary" to="/register" state={{ from: `/app/books/${id}` }}><Heart size={17} />Register to save favorites</Link>}
          {!paid && book.download_filename && <button className="button secondary" disabled={!!pending} onClick={() => void action('download')}>{pending === 'download' ? 'Preparing PDF…' : 'Download PDF'}</button>}</div>
        {notice && <p className="success-notice" role="status">{notice} <Link to={lastAction === 'favorite' ? '/app/favorites' : '/app/library'}>{lastAction === 'favorite' ? 'View favorites' : 'View My Library'}</Link></p>}
        {actionError && <ErrorState message={actionError} retry={() => void action(lastAction)} />}
        <p className="muted detail-note">{paid ? 'The linked publisher controls purchasing and access to this book.' : book.download_filename ? 'Download uses one slot per distinct title. You can retry the same title without using another slot.' : 'Read the online edition at its linked source.'}</p>
      </div>
    </article>
    <section className="related-books" aria-label="Related books"><div className="section-heading"><div><span className="eyebrow">KEEP YOUR CURIOSITY GOING</span><h2>More in {book.category}</h2></div><Link className="text-link" to={`/app/explore?category=${encodeURIComponent(book.category)}`}>Explore category <ArrowRight size={16} /></Link></div>
      {related.loading ? <BookSkeletons /> : related.error ? <ErrorState message={related.error} retry={related.retry} /> : related.data?.items.some(item => item.id !== book.id) ? <div className="book-grid">{related.data.items.filter(item => item.id !== book.id).slice(0, 4).map(item => <BookCard key={item.id} book={item} />)}</div> : <p className="muted">Explore the collection for more programming books.</p>}
    </section>
  </>
}
