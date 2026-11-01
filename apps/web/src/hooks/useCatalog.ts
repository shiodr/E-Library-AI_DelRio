import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { BookPage, Category } from '../types'

export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setData(null)
    api<T>(path, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setData(result)
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load this page.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [path, revision])
  return { data, error, loading, retry: () => setRevision(value => value + 1) }
}
export function useBooks(query = '') { return useResource<BookPage>(`/books${query ? `?${query}` : ''}`) }
export function useCategories() { return useResource<Category[]>('/categories') }
