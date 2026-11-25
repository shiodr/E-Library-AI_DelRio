import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, Spinner } from '../components/ui'
import { invalidateCatalog, useResource } from '../hooks/useCatalog'
import { post } from '../lib/api'
import type { AdminSubmission, Page, SubmissionStatus } from '../types'
import './admin.css'

const pageSize = 12

export function SubmissionReview() {
  const [status, setStatus] = useState<SubmissionStatus>('pending')
  const [offset, setOffset] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const queue = useResource<Page<AdminSubmission>>(`/admin/submissions?status=${status}&limit=${pageSize}&offset=${offset}`)

  async function review(item: AdminSubmission, action: 'approve' | 'decline' | 'archive', reason?: string) {
    if (busy) return
    setBusy(item.id)
    setError('')
    setNotice('')
    try {
      const result = await post<AdminSubmission>(`/admin/submissions/${item.id}/review`, { action, reason })
      if (item.kind === 'book' && action !== 'decline') invalidateCatalog()
      setNotice(`${result.title} is ${result.status}.`)
      if (offset > 0 && queue.data?.items.length === 1) setOffset(previous => previous - pageSize)
      else queue.retry()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update the submission.')
    } finally {
      setBusy('')
    }
  }

  function decline(event: FormEvent<HTMLFormElement>, item: AdminSubmission) {
    event.preventDefault()
    void review(item, 'decline', String(new FormData(event.currentTarget).get('reason')).trim())
  }

  return <>
    <div className="page-heading"><div><h1>Review submissions</h1><p>Check the official source and the contributor’s permission before publishing.</p></div>
      <Link className="button secondary small" to="/app/admin">Back to book management</Link></div>
    <div className="filter-control"><label htmlFor="submission-status">Status</label><select id="submission-status" disabled={!!busy} value={status} onChange={event => { setStatus(event.target.value as SubmissionStatus); setOffset(0) }}>
      <option value="pending">Pending</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="archived">Archived</option>
    </select></div>
    {notice && <p className="success-notice" role="status">{notice}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {queue.loading ? <p role="status"><Spinner /> Loading review queue…</p> : queue.error ? <ErrorState message={queue.error} retry={queue.retry} />
      : queue.data?.items.length ? <div className="resource-grid listing-history">{queue.data.items.map(item => <article className="resource-card" key={item.id}>
        <p className="eyebrow">{item.kind} · {item.category}</p>
        <h2>{item.title}</h2><p className="muted">{item.author} · {item.access_type === 'paid' ? 'Paid at source' : 'Free at source'}</p>
        <p>{item.description}</p>
        <div className="admin-form-actions">
          <a className="text-link" href={item.source_url} target="_blank" rel="noopener noreferrer">Official source</a>
          <a className="text-link" href={item.proof_url} target="_blank" rel="noopener noreferrer">Review permission evidence</a>
        </div>
        {item.decline_reason && <p>Decline reason: {item.decline_reason}</p>}
        {item.status === 'pending' && <>
          <button className="button primary small" disabled={!!busy} onClick={() => void review(item, 'approve')}>Approve listing</button>
          <form onSubmit={event => decline(event, item)} className="listing-history">
            <label className="field">Decline reason<textarea name="reason" maxLength={500} required /></label>
            <button className="button secondary small" disabled={!!busy}>Decline listing</button>
          </form>
        </>}
        {item.status === 'approved' && <button className="button secondary small" disabled={!!busy} onClick={() => void review(item, 'archive')}>Archive listing</button>}
      </article>)}</div> : <p className="empty-inline">No {status} submissions.</p>}
    {queue.data && (offset > 0 || queue.data.total > pageSize) && <div className="pagination">
      <button className="button secondary" disabled={offset === 0 || !!busy} onClick={() => setOffset(previous => previous - pageSize)}>Previous</button>
      <button className="button secondary" disabled={offset + pageSize >= queue.data.total || !!busy} onClick={() => setOffset(previous => previous + pageSize)}>Next</button>
    </div>}
  </>
}
