import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useResource } from '../hooks/useCatalog'
import { native, post } from '../lib/api'
import { resourceKinds } from '../types'
import type { Page, Submission } from '../types'
import { ErrorState, Spinner } from '../components/ui'
import './admin.css'

const pageSize = 12

export function Submissions() {
  const { profile } = useAuth()
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const signedIn = profile?.session_type === 'user'
  const records = useResource<Page<Submission>>(signedIn && !native ? `/submissions?limit=${pageSize}&offset=${offset}` : null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await post<Submission>('/submissions', { ...Object.fromEntries(data), rights_attested: data.has('rights_attested') })
      form.reset()
      setNotice('Submitted for review. You can track the decision here.')
      if (offset === 0) records.retry()
      else setOffset(0)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to submit the listing.')
    } finally {
      setBusy(false)
    }
  }

  if (native) return <Navigate to="/app/explore" replace />
  return <>
    <div className="page-heading"><div><h1>Submit a listing</h1><p>Share a book or learning resource you created or have permission to list.</p></div></div>
    {!signedIn ? <section className="empty-state">
      <h2>Sign in to submit your work</h2>
      <Link className="button primary" to="/login" state={{ from: '/app/submissions' }}>Sign in</Link>
      <Link className="text-link" to="/register" state={{ from: '/app/submissions' }}>Create an account</Link>
    </section> : <>
      <section className="admin-management">
        <form onSubmit={submit}>
          <fieldset className="admin-form-fields" disabled={busy}>
            <legend className="sr-only">Listing details</legend>
            <label className="field">Title<input name="title" maxLength={255} required /></label>
            <label className="field">Author or creator<input name="author" maxLength={255} required /></label>
            <label className="field">Category<input name="category" maxLength={80} required /></label>
            <label className="field">Listing type<select name="kind"><option value="book">Book</option>{resourceKinds.map(kind => <option key={kind} value={kind}>{kind.charAt(0).toUpperCase() + kind.slice(1)}</option>)}</select></label>
            <label className="field">Access<select name="access_type"><option value="free_to_read">Free at source</option><option value="paid">Paid at source</option></select></label>
            <label className="field admin-form-wide">Description<textarea name="description" maxLength={10000} required /></label>
            <label className="field admin-form-wide">Official source URL<input name="source_url" type="url" placeholder="https://" maxLength={500} required /></label>
            <label className="field admin-form-wide">Proof of ownership or permission URL<input name="proof_url" type="url" placeholder="https://" maxLength={500} required /><small className="muted">Link to a source that shows your role or permission. The review team can see this link.</small></label>
          </fieldset>
          <label className="listing-attestation"><input type="checkbox" name="rights_attested" required disabled={busy} /> I own this work or have permission from the rights holder and authorize E-Library AI to publish this listing.</label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="success-notice" role="status">{notice}</p>}
          <button className="button primary" disabled={busy}>Submit for review</button>
        </form>
      </section>
      <section className="listing-history" aria-label="My submissions">
        <h2>My submissions</h2>
        {records.loading ? <p role="status"><Spinner /> Loading submissions…</p> : records.error ? <ErrorState message={records.error} retry={records.retry} />
          : records.data?.items.length ? <div className="resource-grid">{records.data.items.map(item => <article className="resource-card" key={item.id}>
            <h3>{item.title}</h3>
            <p className="listing-status">{item.status}</p>
            {item.decline_reason && <p>{item.decline_reason}</p>}
            {item.status === 'approved' && <Link className="text-link" to={item.published_book_id ? `/app/books/${item.published_book_id}` : '/app/explore?view=resources'}>View in catalog</Link>}
          </article>)}</div> : <p className="muted">You haven’t submitted any listings yet.</p>}
        {records.data && (offset > 0 || records.data.total > pageSize) && <div className="pagination">
          <button className="button secondary" disabled={offset === 0} onClick={() => setOffset(previous => previous - pageSize)}>Previous</button>
          <button className="button secondary" disabled={offset + pageSize >= records.data.total} onClick={() => setOffset(previous => previous + pageSize)}>Next</button>
        </div>}
      </section>
    </>}
  </>
}
