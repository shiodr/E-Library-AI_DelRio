import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useResource } from '../hooks/useCatalog'
import type { Book } from '../types'
import { Cover, ErrorState, LoadingPage } from '../components/ui'

export function BookDetail() {
  const { id } = useParams()
  const { data: book, error, loading, retry } = useResource<Book>(`/books/${id}`)
  if (loading) return <LoadingPage />
  if (error) return <ErrorState message={error} retry={retry} />
  if (!book) return null
  return <><Link to="/app/explore" className="back-link"><ArrowLeft size={17} />Back to collection</Link><article className="book-detail"><div className="detail-cover"><Cover book={book} large /></div><div><span className="pill">{book.category}</span><h1>{book.title}</h1><p className="detail-author">by {book.author}</p><span className="eyebrow">ABOUT THIS BOOK</span><p className="detail-description">{book.description}</p><div className="license-info"><ShieldCheck size={21} /><div><strong>Source & license</strong><p>{book.license_type}</p><a href={book.source_url} target="_blank" rel="noopener noreferrer" className="text-link">Read source and regional terms <ExternalLink size={14} /></a></div></div><button className="button primary" disabled>Save to My Library · Phase 2</button><p className="muted detail-note">Downloads and saving are not available in Phase 1. No allowance has been used.</p></div></article></>
}
