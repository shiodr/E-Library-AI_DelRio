import { ArrowRight, LoaderCircle, Moon, RefreshCw, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import type { Book } from '../types'

export function Brand() {
  return <Link to="/" className="brand" aria-label="E-Library AI by shio del rio home">
    <span className="brand-mark"><img src="/icon.svg" alt="" width={38} height={38} /></span>
    <span className="brand-wordmark"><span>E-Library<span className="ai-label">AI</span></span><small className="brand-owner">by shio del rio</small></span>
  </Link>
}
export function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return <button className="icon-button" onClick={toggle} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}>
    {dark ? <Sun size={19} /> : <Moon size={19} />}
  </button>
}
export function Spinner() { return <LoaderCircle className="spin" size={18} aria-hidden="true" /> }
export function LoadingPage() {
  return <div className="loading-page" role="status"><Spinner /><span>Opening your library…</span></div>
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-state" role="alert"><p>{message}</p>
    {retry && <button className="button secondary" onClick={retry}><RefreshCw size={16} /> Try again</button>}
  </div>
}
export function Cover({ book, large = false }: { book: Book; large?: boolean }) {
  const [title, subtitle] = book.title.split(': ')
  const tone = Array.from(book.title).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6
  return <div className={`book-cover cover-${tone} ${large ? 'cover-large' : ''}`} aria-hidden="true">
    {book.cover_url ? <img src={book.cover_url} alt="" loading="lazy" /> : <>
      <div className="cover-edition">THE PROGRAMMING COLLECTION</div>
      <div className="cover-title">{title}{subtitle && <small>{subtitle}</small>}</div>
      <div className="cover-art"><span /><span /><span /></div>
      <div className="cover-author">{book.author}</div>
    </>}
  </div>
}
export function BookCard({ book }: { book: Book }) {
  const access = book.access_type === 'paid' ? 'Paid publisher listing' : 'Free online edition'
  return <Link to={`/app/books/${book.id}`} className="book-card" aria-label={`${book.title} by ${book.author}. ${access}`}>
    <motion.div className="book-card-frame" whileHover={{ y: -6 }} whileTap={{ scale: .985 }} transition={{ duration: .2 }}>
      <Cover book={book} />
      <div className="book-meta"><span className="eyebrow">{book.category}</span><span className="book-card-arrow"><ArrowRight size={15} /></span></div>
      <h3>{book.title}</h3><p>{book.author}</p>
      <span className="book-access">{access}</span>
    </motion.div>
  </Link>
}
export function BookSkeletons({ count = 4 }: { count?: number }) {
  return <div className="book-grid" role="status" aria-label="Loading books">
    {Array.from({ length: count }, (_, i) => <div className="book-card" key={i}>
      <div className="skeleton skeleton-cover" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" />
    </div>)}
  </div>
}
