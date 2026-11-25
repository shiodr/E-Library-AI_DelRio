import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { BookPage, Category } from '../types'

const catalogCache = new Map<string, { data: unknown; expires: number }>()
let catalogVersion = 0

export function invalidateCatalog() {
  catalogVersion += 1
  catalogCache.clear()
}

function cachedCatalog(path: string) {
  const entry = catalogCache.get(path)
  return entry && entry.expires > Date.now() ? entry : undefined
}

export function useResource<T>(path: string | null) {
  const [revision, setRevision] = useState(0)
  const [response, setResponse] = useState<{ path: string; revision: number; data: T | null; error: string } | null>(null)
  useEffect(() => {
    if (path === null) return
    const cached = cachedCatalog(path)
    if (cached) { setResponse({ path, revision, data: cached.data as T, error: '' }); return }
    const controller = new AbortController()
    const version = catalogVersion
    setResponse(null)
    api<T>(path, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return
      if (version === catalogVersion && (path === '/categories' || path.startsWith('/books?'))) {
        catalogCache.delete(path)
        catalogCache.set(path, { data: result, expires: Date.now() + 30_000 })
        if (catalogCache.size > 8) catalogCache.delete(catalogCache.keys().next().value!)
      }
      setResponse({ path, revision, data: result, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setResponse({ path, revision, data: null, error: error instanceof Error ? error.message : 'Unable to load this page.' })
    })
    return () => controller.abort()
  }, [path, revision])
  const current = response?.path === path && response.revision === revision ? response : null
  const cached = path && !current ? cachedCatalog(path) : undefined
  return {
    data: current?.data ?? (cached ? cached.data as T : null),
    error: current?.error ?? '',
    loading: path !== null && !current && !cached,
    retry: () => { if (path) catalogCache.delete(path); setRevision(value => value + 1) },
  }
}
export function useBooks(query = '') { return useResource<BookPage>(`/books${query ? `?${query}` : ''}`) }
export function useCategories() { return useResource<Category[]>('/categories') }
