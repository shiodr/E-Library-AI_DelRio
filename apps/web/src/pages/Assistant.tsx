import { BookOpen, MessageCircle, Plus, RefreshCw, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { BookCard, Spinner } from '../components/ui'
import { api, ApiError, post } from '../lib/api'
import type { Book } from '../types'
import './assistant.css'

interface AssistantStatus {
  generation_available: boolean
  provider: 'openai'
  model: string | null
}

interface ChatResponse {
  conversation_id: string
  answer: string
  books: Book[]
  mode: 'llm' | 'catalog_only' | 'provider_error'
  generation_available: boolean
  model: string | null
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
  books?: Book[]
  mode?: ChatResponse['mode']
  failed?: boolean
}

const suggestions = [
  'Find beginner-friendly Rust books.',
  'Recommend beginner-friendly Python books.',
  'Find books by Robert C. Martin.',
]

export function Assistant() {
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  const [statusRevision, setStatusRevision] = useState(0)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [restricted, setRestricted] = useState(false)
  const [failedRequest, setFailedRequest] = useState<{ text: string; userId: number } | null>(null)
  const nextId = useRef(0)
  const sending = useRef(false)
  const mounted = useRef(true)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setCheckingStatus(true)
    setStatusError('')
    api<AssistantStatus>('/assistant/status', { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setStatus(result); setRestricted(false) } })
      .catch(reason => {
        if (!controller.signal.aborted) {
          setStatusError(reason instanceof Error ? reason.message : 'Unable to check AI availability.')
          setRestricted(reason instanceof ApiError && reason.status === 403)
        }
      })
      .finally(() => { if (!controller.signal.aborted) setCheckingStatus(false) })
    return () => controller.abort()
  }, [statusRevision])

  useEffect(() => {
    if (!messages.length && !pending) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    end.current?.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [messages.length, pending])

  async function send(text: string, retryUserId?: number) {
    const question = text.trim()
    if (!question || question.length > 1000 || sending.current || restricted) return
    sending.current = true
    setPending(true)
    setError('')
    setFailedRequest(null)
    const userId = retryUserId ?? ++nextId.current
    if (retryUserId === undefined) {
      const userMessage: Message = { id: userId, role: 'user', text: question }
      setMessages(previous => [...previous, userMessage].slice(-24))
      setDraft('')
    } else {
      setMessages(previous => previous.map(message => message.id === userId ? { ...message, failed: false } : message))
    }
    try {
      const result = await post<ChatResponse>('/assistant/chat', { message: question, conversation_id: conversationId })
      if (!mounted.current) return
      setConversationId(result.conversation_id)
      setStatus({ generation_available: result.mode !== 'catalog_only' && Boolean(result.model), model: result.model, provider: 'openai' })
      setStatusError('')
      const answer: Message = {
        id: ++nextId.current, role: 'assistant', text: result.answer, books: result.books, mode: result.mode,
      }
      setMessages(previous => [...previous, answer].slice(-24))
    } catch (reason) {
      if (!mounted.current) return
      setRestricted(reason instanceof ApiError && reason.status === 403)
      setError(reason instanceof Error ? reason.message : 'Unable to get a response. Please try again.')
      setFailedRequest({ text: question, userId })
      setMessages(previous => previous.map(message => message.id === userId ? { ...message, failed: true } : message))
    } finally {
      sending.current = false
      if (mounted.current) setPending(false)
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(draft) }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send(draft)
    }
  }

  function newConversation() {
    if (sending.current) return
    setMessages([])
    setConversationId(null)
    setDraft('')
    setError('')
    setFailedRequest(null)
  }

  return <div className="library-assistant">
    <div className="page-heading"><div>
      <span className="eyebrow">ASK THE COLLECTION</span>
      <h1>Your library assistant<span className="heading-dot">.</span></h1>
      <p>Find programming books, ask a follow-up, and open a real catalog record.</p>
    </div><button className="button secondary small" onClick={newConversation} disabled={pending || !messages.length}>
      <Plus size={16} />New conversation
    </button></div>

    <section className="library-chat" aria-label="Library assistant">
      <header className="library-chat-header">
        <span className="assistant-avatar"><Sparkles size={23} /></span>
        <div><h2>E-Library Assistant</h2><p>One catalog. Website and Android.</p></div>
        <span className="library-chat-mode">{checkingStatus && !status ? 'Checking availability' : status?.generation_available ? 'AI configured' : status ? 'Catalog retrieval' : 'Availability unknown'}</span>
      </header>
      {restricted && <div className="library-chat-disclosure" role="status"><ShieldCheck size={18} /><span>This session cannot use the assistant. <Link className="text-link" to="/login" state={{ from: '/app/assistant' }}>Sign in</Link> or <Link className="text-link" to="/register" state={{ from: '/app/assistant' }}>Create account</Link>. You can continue exploring the catalog.</span></div>}

      {status && !status.generation_available && <p className="library-chat-disclosure" role="status">
        <BookOpen size={18} /><span>Catalog retrieval is available. AI generation is not configured.</span>
      </p>}
      {statusError && <div className="library-chat-status-error" role="status">
        <p>{restricted ? statusError : 'AI availability could not be checked. You can still try a catalog question.'}</p>
        <button className="text-link" onClick={() => setStatusRevision(value => value + 1)} disabled={checkingStatus}><RefreshCw size={14} />Check again</button>
      </div>}

      <div className="library-chat-transcript" role="log" aria-label="Assistant conversation" aria-live="polite" aria-relevant="additions text">
        {!messages.length && <div className="library-chat-welcome">
          <span className="library-chat-welcome-icon"><MessageCircle size={31} strokeWidth={1.5} /></span>
          <h3>What would you like to learn?</h3>
          <p>Ask about a language, author, topic, or experience level. Recommendations link to books in this library.</p>
          <div className="library-chat-suggestions" aria-label="Suggested questions">{suggestions.map(question =>
            <button key={question} onClick={() => void send(question)} disabled={pending || restricted}>{question}<Send size={14} /></button>,
          )}</div>
        </div>}
        {messages.map(message => <article className={`library-chat-message library-chat-message-${message.role}`} key={message.id} aria-label={`${message.role === 'user' ? 'Your' : 'Assistant'} message`}>
          <span className="library-chat-speaker">{message.role === 'user' ? 'You' : 'Library assistant'}</span>
          <p className="library-chat-text">{message.text}</p>
          {message.failed && <span className="library-chat-failed">{restricted ? 'This session does not have assistant access.' : 'Response unavailable. Retry below.'}</span>}
          {!!message.books?.length && <div className="library-chat-books" aria-label="Catalog recommendations">{message.books.map(book => <BookCard book={book} key={book.id} />)}</div>}
          {message.role === 'assistant' && <span className="library-chat-response-mode">{message.mode === 'llm' ? 'AI response grounded in catalog records' : message.mode === 'provider_error' ? 'Catalog retrieval · AI generation temporarily unavailable' : 'Catalog retrieval · AI generation not configured'}</span>}
        </article>)}
        {pending && <div className="library-chat-pending" role="status"><Spinner /><span>Searching the catalog and preparing your response…</span></div>}
        <div ref={end} />
      </div>

      {error && <div className="library-chat-error" role="alert"><p>{error}</p>
        {failedRequest && !restricted && <button className="button secondary small" disabled={pending} onClick={() => void send(failedRequest.text, failedRequest.userId)}><RefreshCw size={15} />Retry question</button>}
      </div>}

      <form className="library-chat-form" onSubmit={submit}>
        <label htmlFor="library-question">Ask the library</label>
        <div className="library-chat-input-row"><textarea id="library-question" value={draft} maxLength={1000} rows={2}
          placeholder="Try: Which Rust books are suitable for beginners?" onChange={event => setDraft(event.target.value)}
          onKeyDown={keyDown} aria-describedby="library-question-help" disabled={pending || restricted} />
          <button className="button primary" disabled={pending || restricted || !draft.trim()} aria-label="Send question">{pending ? <Spinner /> : <Send size={18} />}<span>Send</span></button>
        </div>
        <div className="library-chat-form-hint"><p id="library-question-help">Enter to send · Shift+Enter for a new line. Avoid sharing personal or sensitive details.</p><span aria-label={`${draft.length} of 1000 characters`}>{draft.length}/1000</span></div>
      </form>
    </section>
    <p className="library-chat-source-note">Free editions and paid publisher listings are labeled separately. This assistant does not purchase or download books.</p>
  </div>
}
