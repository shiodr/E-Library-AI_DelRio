import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useResource } from '../hooks/useCatalog'
import { api } from '../lib/api'
import type { Book } from '../types'
import { BookCard, ErrorState, LoadingPage } from '../components/ui'

interface Entry { id: string; book: Book; downloaded_at?: string; created_at?: string }
interface History { items: Entry[]; total: number; limit: number; offset: number; allowance?: { limit: number; used: number; remaining: number } }

export function Library({ favorites = false }: { favorites?: boolean }) {
  const { profile } = useAuth()
  const [offset, setOffset] = useState(0)
  const [actionError, setActionError] = useState('')
  const [pending, setPending] = useState('')
  const guest = profile?.session_type === 'guest'
  const resource = useResource<History>(`${favorites && !guest ? '/favorites' : '/downloads'}?limit=12&offset=${offset}`)
  async function remove(id: string) {
    setPending(id); setActionError('')
    try { await api(`/favorites/${id}`, { method: 'DELETE' }); resource.retry() }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Unable to remove favorite.') }
    finally { setPending('') }
  }
  return <>
    <div className="page-heading"><div><span className="eyebrow">YOUR PERSONAL READING SPACE</span><h1>{favorites ? 'Favorites' : 'My Library'}<span className="heading-dot">.</span></h1><p>{favorites ? 'Books you saved to your account, shared across your devices.' : 'Your recorded download-request demonstrations.'}</p></div></div>
    {!favorites && <div className="library-disclosure"><strong>Download tracking demonstration</strong><p>These records test ownership and the five-book guest / ten-book account limits. No book file is downloaded or delivered.</p>{resource.data?.allowance && <p role="status">{resource.data.allowance.used} of {resource.data.allowance.limit} tracked · {resource.data.allowance.remaining} remaining · {guest ? 'Per guest session' : 'Per registered account'}</p>}</div>}
    {actionError && <ErrorState message={actionError} />}
    {favorites && guest ? <div className="empty-state"><h2>Create an account to save favorites.</h2><Link to="/register" className="button primary">Create your free account</Link></div>
      : resource.loading ? <LoadingPage /> : resource.error ? <ErrorState message={resource.error} retry={resource.retry} />
        : resource.data?.items.length ? <div className="book-grid">{resource.data.items.map(entry => <div key={entry.id}>
          {entry.book.is_active === false ? <div className="library-archived"><h3>{entry.book.title}</h3><p>Archived from the public catalog. Your record is preserved.</p></div> : <BookCard book={entry.book} />}
          <p className="muted">{favorites ? 'Saved' : 'Tracking demo recorded'} {new Date(entry.created_at || entry.downloaded_at || '').toLocaleDateString()}</p>
          {favorites && <button className="text-link" disabled={pending === entry.book.id} onClick={() => void remove(entry.book.id)}>Remove favorite</button>}
        </div>)}</div> : <div className="empty-state"><h2>{favorites ? 'No favorites yet.' : 'No tracking demonstrations yet.'}</h2><p>{favorites ? 'Save a book from its details page.' : 'Open a free book and choose “Record tracking demonstration”.'}</p><Link to="/app/explore" className="button primary">Explore books</Link></div>}
    {resource.data && (!favorites || !guest) && (offset > 0 || resource.data.total > 12) && <div className="pagination"><button className="button secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 12))}>Previous</button><span>Page {Math.floor(offset / 12) + 1}</span><button className="button secondary" disabled={offset + 12 >= resource.data.total} onClick={() => setOffset(offset + 12)}>Next</button></div>}
  </>
}
