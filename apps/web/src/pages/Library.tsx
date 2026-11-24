import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, LibraryBig } from 'lucide-react'
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
  useEffect(() => { setOffset(0) }, [favorites, guest])
  const resource = useResource<History>(favorites && guest ? null : `${favorites ? '/favorites' : '/downloads'}?limit=12&offset=${offset}`)
  const saved = useResource<History>(!favorites && profile?.session_type === 'user' ? '/favorites?limit=4' : null)
  async function remove(id: string) {
    setPending(id); setActionError('')
    try { await api(`/favorites/${id}`, { method: 'DELETE' }); resource.retry() }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Unable to remove favorite.') }
    finally { setPending('') }
  }
  return <>
    <div className="page-heading"><div><span className="eyebrow">YOUR PERSONAL READING SPACE</span><h1>{favorites ? 'Favorites' : 'My Library'}<span className="heading-dot">.</span></h1><p>{favorites ? 'Books you saved to your account, shared across your devices.' : 'Saved books and download requests.'}</p></div></div>
    {guest && <section className="empty-state library-empty guest-feature-state">
      <span className="empty-icon">{favorites ? <Heart size={30} /> : <LibraryBig size={30} />}</span>
      <h2>{favorites ? 'Create an account to save favorites.' : 'A home for your next chapter.'}</h2>
      <p>{favorites ? 'Keep the books you love in one place. Sign in to save favorites and find them on web and Android.' : 'Your guest download history appears below. Create an account to keep your reading activity and favorites across devices.'}</p>
      <div className="guest-state-actions"><Link to="/login" state={{ from: favorites ? '/app/favorites' : '/app/library' }} className="button primary">Sign in</Link><Link to="/register" state={{ from: favorites ? '/app/favorites' : '/app/library' }} className="button secondary">Create account</Link><Link to="/app/explore" className="text-link">Continue exploring</Link></div>
    </section>}
    {!favorites && profile?.session_type === 'user' && <section className="related-books" aria-label="Saved books">
      <div className="section-heading"><h2>Saved books</h2><Link to="/app/favorites" className="text-link">See all saved books</Link></div>
      {saved.loading ? <LoadingPage /> : saved.error ? <ErrorState message={saved.error} retry={saved.retry} />
        : saved.data?.items.length ? <div className="book-grid">{saved.data.items.map(({ book }) => book.is_active === false
          ? <div key={book.id} className="library-archived"><h3>{book.title}</h3><p>Archived from the public catalog.</p></div>
          : <BookCard key={book.id} book={book} />)}</div> : <p className="muted">Books you save appear here.</p>}
    </section>}
    {!favorites && <div className="library-disclosure"><strong>Download history</strong><p>One slot is used per distinct title. This history also includes records from the earlier tracking demo.</p>{resource.data?.allowance && <p role="status">{resource.data.allowance.used} of {resource.data.allowance.limit} used · {resource.data.allowance.remaining} remaining · {guest ? 'Per guest session' : 'Per registered account'}</p>}</div>}
    {actionError && <ErrorState message={actionError} />}
    {favorites && guest ? null
      : resource.loading ? <LoadingPage /> : resource.error ? <ErrorState message={resource.error} retry={resource.retry} />
        : resource.data?.items.length ? <div className="book-grid">{resource.data.items.map(entry => <div key={entry.id}>
          {entry.book.is_active === false ? <div className="library-archived"><h3>{entry.book.title}</h3><p>Archived from the public catalog. Your record is preserved.</p></div> : <BookCard book={entry.book} />}
          <p className="muted">{favorites ? 'Saved' : 'Request recorded'} {new Date(entry.created_at || entry.downloaded_at || '').toLocaleDateString()}</p>
          {favorites && <button className="text-link" disabled={pending === entry.book.id} onClick={() => void remove(entry.book.id)}>Remove favorite</button>}
        </div>)}</div> : <div className="empty-state"><h2>{favorites ? 'No favorites yet.' : 'No download requests yet.'}</h2><p>{favorites ? 'Save a book from its details page.' : 'Find a book with a Download PDF button.'}</p><Link to="/app/explore" className="button primary">Explore books</Link></div>}
    {resource.data && (!favorites || !guest) && (offset > 0 || resource.data.total > 12) && <div className="pagination"><button className="button secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 12))}>Previous</button><span>Page {Math.floor(offset / 12) + 1}</span><button className="button secondary" disabled={offset + 12 >= resource.data.total} onClick={() => setOffset(offset + 12)}>Next</button></div>}
  </>
}
