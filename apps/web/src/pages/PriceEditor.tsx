import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { Book } from '../types'

export function PriceEditor({ book, close, saved }: { book: Book; close: () => void; saved: () => void }) {
  const [currency, setCurrency] = useState(book.price?.currency ?? 'PHP')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const offer = book.price
  const foreign = currency !== 'PHP'
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', dateStyle: 'short' }).format(new Date())

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    await write('PUT', JSON.stringify({ ...data, currency: currency.trim().toUpperCase() }))
  }

  async function write(method: 'PUT' | 'DELETE', body?: string) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await api(`/admin/books/${book.id}/price`, { method, body })
      saved()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update the price.')
      setBusy(false)
    }
  }

  return <section className="admin-book-editor" aria-labelledby="price-editor-heading">
    <h3 id="price-editor-heading">Price for {book.title}</h3>
    <p className="muted">Enter the seller’s verified offer and the date you checked it.</p>
    <form onSubmit={save}>
      <fieldset className="admin-form-fields" disabled={busy}>
        <legend className="sr-only">Publisher price</legend>
        <label className="field">Original amount<input name="source_amount" defaultValue={offer?.source_amount} type="number" step="0.0001" min="0.0001" required /></label>
        <label className="field">Currency code<input name="currency" value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} maxLength={3} pattern="[A-Z]{3}" required /></label>
        <label className="field">Offer format<input name="offer_format" defaultValue={offer?.offer_format ?? 'Ebook'} maxLength={80} required /></label>
        <label className="field">Date checked<input name="checked_on" type="date" max={today} defaultValue={offer?.checked_on ?? today} required /></label>
        <label className="field admin-form-wide">Publisher price URL<input name="source_url" type="url" defaultValue={offer?.source_url ?? book.source_url} maxLength={500} required /></label>
        {foreign && <>
          <label className="field">BSP rate in pesos per unit<input name="rate_php_per_unit" type="number" step="0.00000001" min="0.00000001" defaultValue={offer?.rate_php_per_unit ?? ''} required /></label>
          <label className="field">BSP rate date<input name="rate_date" type="date" max={today} defaultValue={offer?.rate_date ?? ''} required /></label>
        </>}
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-form-actions">
        <button className="button primary small" disabled={busy}>Save price</button>
        {offer && <button className="button secondary small" type="button" disabled={busy} onClick={() => void write('DELETE')}>Clear price</button>}
        <button className="button secondary small" type="button" disabled={busy} onClick={close}>Cancel price editing</button>
      </div>
    </form>
  </section>
}
